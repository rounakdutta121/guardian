import {
  emergencyContactRepo,
  emergencySessionRepo,
  journeyRepo,
  safeCheckinRepo,
  fakeCallRepo,
  notificationRepo,
  settingsRepo,
  activityLogRepo,
  offlineQueueRepo,
  profileRepo,
  permissionsRepo,
} from "@/lib/repositories";
import { generateMapsUrl } from "@/lib/utils";
import { haversineMeters } from "@/lib/location/helpers";
import { buildSmsPreviewLine } from "@/lib/communication/message-builder";
import type { EmergencyTriggerInput, JourneyInput } from "@/lib/validations";
import { addMinutes } from "date-fns";
import {
  expireReason,
  shouldAutoExpireSession,
} from "./emergency-session-lifecycle";

export class EmergencyEngineService {
  /** Close abandoned countdown / stale test / stale active sessions. */
  async expireStaleSessions(userId: string): Promise<number> {
    const open = await emergencySessionRepo.findAllOpen(userId);
    let expired = 0;

    for (const session of open) {
      if (!shouldAutoExpireSession(session)) continue;

      const timeline = [
        ...(session.timeline ?? []),
        {
          event: "auto_expired",
          timestamp: new Date().toISOString(),
          data: { reason: expireReason(session) },
        },
      ];

      if (session.status === "countdown" || session.isTest) {
        await emergencySessionRepo.update(session.id, userId, {
          status: "cancelled",
          cancelledAt: new Date(),
          timeline,
        });
      } else {
        await emergencySessionRepo.update(session.id, userId, {
          status: "resolved",
          resolvedAt: new Date(),
          timeline,
        });
      }
      expired++;
    }

    return expired;
  }

  async getActiveSession(userId: string) {
    await this.expireStaleSessions(userId);
    return emergencySessionRepo.findActive(userId);
  }

  /** Force-close every open countdown/active session for the user. */
  async closeAllOpenSessions(userId: string) {
    await this.expireStaleSessions(userId);
    const open = await emergencySessionRepo.findAllOpen(userId);
    for (const session of open) {
      try {
        if (session.status === "countdown" || session.isTest) {
          await this.cancelEmergency(session.id, userId);
        } else {
          await this.resolveEmergency(session.id, userId);
        }
      } catch {
        // continue closing remaining sessions
      }
    }
    return open.length;
  }

  async startEmergency(userId: string, input: EmergencyTriggerInput) {
    await this.expireStaleSessions(userId);

    const active = await emergencySessionRepo.findActive(userId);
    if (active) {
      if (input.isTest) {
        await this.resolveEmergency(active.id, userId).catch(() =>
          this.cancelEmergency(active.id, userId)
        );
      } else if (active.status === "countdown") {
        await this.cancelEmergency(active.id, userId);
      } else {
        throw new Error("An emergency session is already active");
      }
    }

    const settings = await settingsRepo.findByUserId(userId);
    const contacts = await emergencyContactRepo.findByUserId(userId);
    const sosContacts = contacts.filter((c) => c.notifyOnSos);

    const shareLocation = settings?.autoShareLocation !== false;
    const lat = shareLocation ? (input.latitude ?? 0) : 0;
    const lng = shareLocation ? (input.longitude ?? 0) : 0;
    const mapsUrl = lat && lng ? generateMapsUrl(lat, lng) : null;

    const messageContext = {
      mapsUrl,
      latitude: lat || null,
      longitude: lng || null,
      batteryLevel: input.batteryLevel ?? null,
      timestamp: new Date(),
    };

    const smsPreview = sosContacts.map((c) =>
      buildSmsPreviewLine(c.phone, messageContext)
    );
    const callPreview = sosContacts.map((c) => `Call: ${c.name} (${c.phone})`);

    const timeline = [
      {
        event: "emergency_initiated",
        timestamp: new Date().toISOString(),
        data: { trigger: input.trigger, isTest: input.isTest },
      },
      {
        event: "gps_captured",
        timestamp: new Date().toISOString(),
        data: {
          latitude: lat,
          longitude: lng,
          accuracy: input.accuracy,
          permissionDenied: !shareLocation || (!input.latitude && !input.longitude),
        },
      },
      {
        event: "contacts_prepared",
        timestamp: new Date().toISOString(),
        data: { count: sosContacts.length },
      },
    ];

    const session = await emergencySessionRepo.create(userId, {
      status: input.isTest ? "active" : "countdown",
      trigger: input.trigger,
      isTest: input.isTest,
      latitude: lat || null,
      longitude: lng || null,
      accuracy: input.accuracy ?? null,
      address: input.address ?? null,
      mapsUrl,
      batteryLevel: input.batteryLevel ?? null,
      smsPreview,
      callPreview,
      timeline,
      contactsNotified: sosContacts.map((c) => c.id),
    });

    await activityLogRepo.create(userId, {
      type: input.isTest ? "test_sos" : "sos",
      title: input.isTest ? "Test SOS Activated" : "Emergency SOS Activated",
      description: `Emergency session ${session.id} created`,
      metadata: { sessionId: session.id, trigger: input.trigger },
    });

    await notificationRepo.create(userId, {
      type: "emergency",
      title: input.isTest ? "Test SOS Started" : "Emergency Activated",
      body: input.isTest
        ? "Test simulation running — no messages sent"
        : "Emergency workflow started — contacts prepared",
      data: {
        sessionId: session.id,
        isTest: input.isTest,
        route: input.isTest ? "/safety/test-sos" : "/home",
      },
    });

    return session;
  }

  async activateEmergency(sessionId: string, userId: string) {
    const session = await emergencySessionRepo.findById(sessionId, userId);
    if (!session) throw new Error("Session not found");

    const note = session.isTest
      ? "Test simulation — no actual messages sent"
      : "Native SMS and phone communication initiated via device";

    const updatedTimeline = [
      ...(session.timeline ?? []),
      {
        event: "emergency_activated",
        timestamp: new Date().toISOString(),
        data: { note },
      },
      {
        event: "native_communication_ready",
        timestamp: new Date().toISOString(),
        data: { method: "device_sms_and_dialer" },
      },
      {
        event: "live_tracking_started",
        timestamp: new Date().toISOString(),
      },
    ];

    return emergencySessionRepo.update(sessionId, userId, {
      status: "active",
      timeline: updatedTimeline,
    });
  }

  async updateLocation(
    sessionId: string,
    userId: string,
    location: {
      latitude: number;
      longitude: number;
      accuracy?: number;
      batteryLevel?: number;
      address?: string;
    }
  ) {
    const session = await emergencySessionRepo.findById(sessionId, userId);
    if (!session || session.status !== "active") {
      throw new Error("No active emergency session");
    }

    const mapsUrl = generateMapsUrl(location.latitude, location.longitude);
    const timeline = [
      ...(session.timeline ?? []),
      {
        event: "location_update",
        timestamp: new Date().toISOString(),
        data: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
        },
      },
    ];

    return emergencySessionRepo.update(sessionId, userId, {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy ?? session.accuracy,
      address: location.address ?? session.address,
      mapsUrl,
      batteryLevel: location.batteryLevel ?? session.batteryLevel,
      timeline,
    });
  }

  async resolveEmergency(sessionId: string, userId: string) {
    const existing = await emergencySessionRepo.findById(sessionId, userId);
    const session = await emergencySessionRepo.update(sessionId, userId, {
      status: "resolved",
      resolvedAt: new Date(),
      timeline: [
        ...(existing?.timeline ?? []),
        {
          event: "emergency_resolved",
          timestamp: new Date().toISOString(),
        },
      ],
    });

    await activityLogRepo.create(userId, {
      type: "sos",
      title: "Emergency Resolved",
      description: `Session ${sessionId} resolved`,
      metadata: { sessionId },
    });

    return session;
  }

  async cancelEmergency(sessionId: string, userId: string) {
    const existing = await emergencySessionRepo.findById(sessionId, userId);
    return emergencySessionRepo.update(sessionId, userId, {
      status: "cancelled",
      cancelledAt: new Date(),
      timeline: [
        ...(existing?.timeline ?? []),
        {
          event: "emergency_cancelled",
          timestamp: new Date().toISOString(),
        },
      ],
    });
  }

  async appendTimelineEvent(
    sessionId: string,
    userId: string,
    event: string,
    data?: Record<string, unknown>
  ) {
    const session = await emergencySessionRepo.findById(sessionId, userId);
    if (!session) throw new Error("Session not found");

    return emergencySessionRepo.update(sessionId, userId, {
      timeline: [
        ...(session.timeline ?? []),
        {
          event,
          timestamp: new Date().toISOString(),
          data,
        },
      ],
    });
  }
}

export class JourneyService {
  async startJourney(userId: string, data: JourneyInput) {
    const active = await journeyRepo.findActive(userId, data.isGuardianMode);
    if (active) {
      throw new Error(
        data.isGuardianMode
          ? "Guardian Mode is already active"
          : "A journey is already active"
      );
    }

    const journey = await journeyRepo.create(userId, {
      ...data,
      status: "active",
      startedAt: new Date(),
    });

    const journeyContacts = (await emergencyContactRepo.findByUserId(userId)).filter(
      (c) => c.notifyOnJourney
    );

    await activityLogRepo.create(userId, {
      type: data.isGuardianMode ? "guardian_mode" : "journey_start",
      title: data.isGuardianMode ? "Guardian Mode Started" : "Journey Started",
      description: `Destination: ${data.destinationName}`,
      metadata: { journeyId: journey.id, shareToken: journey.shareToken },
    });

    await notificationRepo.create(userId, {
      type: "journey",
      title: data.isGuardianMode ? "Guardian Mode Active" : "Journey Started",
      body: `Tracking to ${data.destinationName}${journeyContacts.length ? ` — ${journeyContacts.length} contact(s) notified` : ""}`,
      data: {
        journeyId: journey.id,
        shareToken: journey.shareToken,
        isGuardianMode: data.isGuardianMode,
        route: data.isGuardianMode ? "/safety/guardian" : "/safety/journey",
      },
    });

    return journey;
  }

  async pauseJourney(journeyId: string, userId: string) {
    const journey = await journeyRepo.findById(journeyId, userId);
    if (!journey) throw new Error("Journey not found");
    return journeyRepo.update(journeyId, userId, {
      status: "paused",
      pausedAt: new Date(),
    });
  }

  async resumeJourney(journeyId: string, userId: string) {
    const journey = await journeyRepo.findById(journeyId, userId);
    if (!journey) throw new Error("Journey not found");
    return journeyRepo.update(journeyId, userId, {
      status: "active",
      pausedAt: null,
    });
  }

  async stopJourney(journeyId: string, userId: string) {
    const journey = await journeyRepo.findById(journeyId, userId);
    if (!journey) throw new Error("Journey not found");
    const updated = await journeyRepo.update(journeyId, userId, {
      status: "completed",
      completedAt: new Date(),
    });

    await activityLogRepo.create(userId, {
      type: "journey_end",
      title: "Journey Completed",
      description: `Journey to ${updated?.destinationName} completed`,
      metadata: { journeyId },
    });

    return updated;
  }

  async recordLocation(
    journeyId: string,
    userId: string,
    location: {
      latitude: number;
      longitude: number;
      accuracy?: number;
      speed?: number;
      batteryLevel?: number;
    }
  ) {
    const journey = await journeyRepo.findById(journeyId, userId);
    if (!journey || journey.status !== "active") {
      throw new Error("No active journey found");
    }

    const locations = await journeyRepo.getLocations(journeyId, userId, 1);
    const prev = locations[0];
    let totalDistance = journey.totalDistanceMeters ?? 0;
    if (prev) {
      totalDistance += haversineMeters(
        prev.latitude,
        prev.longitude,
        location.latitude,
        location.longitude
      );
    }

    const speedKmh = location.speed
      ? location.speed * 3.6
      : journey.currentSpeedKmh;

    await journeyRepo.addLocation(journeyId, userId, {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy ?? null,
      speed: location.speed ?? null,
      batteryLevel: location.batteryLevel ?? null,
    });

    return journeyRepo.update(journeyId, userId, {
      totalDistanceMeters: totalDistance,
      currentDistanceMeters: totalDistance,
      currentSpeedKmh: speedKmh ?? null,
      batteryLevel: location.batteryLevel ?? journey.batteryLevel,
    });
  }
}

export class SafeCheckinService {
  async createCheckin(
    userId: string,
    durationMinutes: number,
    message?: string,
    notifyContacts = true
  ) {
    const active = await safeCheckinRepo.findActive(userId);
    if (active) throw new Error("An active check-in already exists");

    const now = new Date();
    const expiresAt = addMinutes(now, durationMinutes);

    const checkin = await safeCheckinRepo.create(userId, {
      durationMinutes,
      message: message ?? null,
      notifyContacts,
      scheduledAt: now,
      expiresAt,
      status: "active",
    });

    await activityLogRepo.create(userId, {
      type: "checkin",
      title: "Safe Check-In Started",
      description: `Timer set for ${durationMinutes} minutes`,
      metadata: { checkinId: checkin.id },
    });

    await notificationRepo.create(userId, {
      type: "checkin",
      title: "Check-In Timer Started",
      body: `Confirm your safety within ${durationMinutes} minutes`,
      data: { checkinId: checkin.id, route: "/safety/checkin" },
    });

    if (notifyContacts) {
      const contacts = (await emergencyContactRepo.findByUserId(userId)).filter(
        (c) => c.notifyOnCheckin
      );
      if (contacts.length > 0) {
        await notificationRepo.create(userId, {
          type: "reminder",
          title: "Contacts Notified",
          body: `${contacts.length} contact(s) will be alerted if you don't check in`,
          data: { checkinId: checkin.id, route: "/safety/checkin" },
        });
      }
    }

    return checkin;
  }

  async confirmCheckin(checkinId: string, userId: string) {
    const checkin = await safeCheckinRepo.update(checkinId, userId, {
      status: "confirmed",
      confirmedAt: new Date(),
    });

    await activityLogRepo.create(userId, {
      type: "checkin",
      title: "Safe Check-In Confirmed",
      description: "You confirmed you are safe",
      metadata: { checkinId },
    });

    return checkin;
  }

  async expireCheckin(checkinId: string, userId: string) {
    const checkin = await safeCheckinRepo.findById(checkinId, userId);
    if (!checkin || checkin.status !== "active") return null;

    await safeCheckinRepo.update(checkinId, userId, { status: "missed" });

    await activityLogRepo.create(userId, {
      type: "checkin",
      title: "Check-In Missed",
      description: "Timer expired without confirmation",
      metadata: { checkinId },
    });

    await notificationRepo.create(userId, {
      type: "reminder",
      title: "Check-In Missed",
      body: "You did not confirm your safety in time",
      data: { checkinId, route: "/safety/checkin" },
    });

    return checkin;
  }

  async needHelp(
    checkinId: string,
    userId: string,
    location?: {
      latitude?: number;
      longitude?: number;
      accuracy?: number;
      batteryLevel?: number;
    }
  ) {
    await safeCheckinRepo.update(checkinId, userId, { status: "need_help" });
    const engine = new EmergencyEngineService();
    const session = await engine.startEmergency(userId, {
      trigger: "safe_checkin",
      isTest: false,
      latitude: location?.latitude,
      longitude: location?.longitude,
      accuracy: location?.accuracy,
      batteryLevel: location?.batteryLevel,
    });
    await safeCheckinRepo.update(checkinId, userId, {
      emergencySessionId: session.id,
    });
    return session;
  }
}

export class FakeCallService {
  async scheduleCall(
    userId: string,
    data: {
      callerName: string;
      callerNumber?: string;
      callerPhotoUrl?: string;
      delaySeconds: number;
      ringtone: string;
      scheduledAt?: Date;
    }
  ) {
    const settings = await settingsRepo.findByUserId(userId);
    const scheduledAt =
      data.scheduledAt ?? new Date(Date.now() + data.delaySeconds * 1000);

    const call = await fakeCallRepo.create(userId, {
      callerName: data.callerName,
      callerNumber: data.callerNumber ?? null,
      callerPhotoUrl: data.callerPhotoUrl ?? null,
      delaySeconds: data.delaySeconds,
      ringtone: data.ringtone || settings?.fakeCallRingtone || "default",
      scheduledAt,
      status: "scheduled",
    });

    await activityLogRepo.create(userId, {
      type: "fake_call",
      title: "Fake Call Scheduled",
      description: `Incoming call from ${data.callerName}`,
      metadata: { callId: call.id },
    });

    await notificationRepo.create(userId, {
      type: "fake_call",
      title: "Fake Call Scheduled",
      body: `${data.callerName} will call in ${data.delaySeconds}s`,
      data: { callId: call.id, route: "/safety/fake-call" },
    });

    return call;
  }

  async triggerCall(callId: string, userId: string) {
    const call = await fakeCallRepo.findById(callId, userId);
    if (!call) throw new Error("Not found");
    return fakeCallRepo.update(callId, userId, {
      status: "ringing",
      triggeredAt: new Date(),
    });
  }

  async answerCall(callId: string, userId: string) {
    const call = await fakeCallRepo.findById(callId, userId);
    if (!call) throw new Error("Not found");
    return fakeCallRepo.update(callId, userId, {
      status: "answered",
      answeredAt: new Date(),
    });
  }

  async cancelCall(callId: string, userId: string) {
    const call = await fakeCallRepo.findById(callId, userId);
    if (!call) throw new Error("Not found");
    return fakeCallRepo.update(callId, userId, { status: "cancelled" });
  }
}

export class OnboardingService {
  async initializeUser(userId: string, name: string) {
    await profileRepo.upsert(userId, { displayName: name });
    await settingsRepo.upsert(userId, {});
    await permissionsRepo.upsert(userId, {});
  }
}

export class OfflineSyncService {
  async queueAction(
    userId: string,
    action: string,
    payload: Record<string, unknown>
  ) {
    return offlineQueueRepo.enqueue(userId, action, payload);
  }

  async processQueue(userId: string) {
    const pending = await offlineQueueRepo.getPending(userId);
    const results = [];
    const engine = new EmergencyEngineService();
    const journey = new JourneyService();

    for (const item of pending) {
      try {
        if (item.retryCount >= item.maxRetries) {
          await offlineQueueRepo.markFailed(item.id, userId, "Max retries exceeded");
          results.push({ id: item.id, status: "failed" });
          continue;
        }

        switch (item.action) {
          case "emergency_start": {
            const p = item.payload as EmergencyTriggerInput;
            await engine.startEmergency(userId, p);
            break;
          }
          case "emergency_location": {
            const p = item.payload as {
              sessionId: string;
              latitude: number;
              longitude: number;
            };
            await engine.updateLocation(p.sessionId, userId, p);
            break;
          }
          case "contact_create": {
            const p = item.payload as Parameters<typeof emergencyContactRepo.create>[1];
            await emergencyContactRepo.create(userId, p);
            break;
          }
          case "checkin_create": {
            const p = item.payload as {
              durationMinutes: number;
              message?: string;
            };
            const checkinService = new SafeCheckinService();
            await checkinService.createCheckin(
              userId,
              p.durationMinutes,
              p.message
            );
            break;
          }
          case "journey_location": {
            const p = item.payload as {
              journeyId: string;
              latitude: number;
              longitude: number;
            };
            await journey.recordLocation(p.journeyId, userId, p);
            break;
          }
          default:
            break;
        }

        await offlineQueueRepo.markProcessed(item.id, userId);
        results.push({ id: item.id, status: "completed" });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        await offlineQueueRepo.markFailed(item.id, userId, message);
        results.push({ id: item.id, status: "failed", error: message });
      }
    }

    return results;
  }
}

export const emergencyEngine = new EmergencyEngineService();
export const journeyService = new JourneyService();
export const safeCheckinService = new SafeCheckinService();
export const fakeCallService = new FakeCallService();
export const onboardingService = new OnboardingService();
export const offlineSyncService = new OfflineSyncService();
