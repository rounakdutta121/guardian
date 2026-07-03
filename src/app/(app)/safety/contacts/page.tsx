"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useEmergencyContacts } from "@/hooks/use-api";
import {
  emergencyContactFormSchema,
  toEmergencyContactPayload,
  type EmergencyContactFormInput,
} from "@/lib/validations";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Search,
  Star,
  Phone,
  Trash2,
  Pencil,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const defaultFormValues: EmergencyContactFormInput = {
  name: "",
  phone: "",
  relationship: "",
  priority: 1,
  isFavorite: false,
  notifyOnSos: true,
  notifyOnCheckin: false,
  notifyOnJourney: false,
};

export default function EmergencyContactsPage() {
  const { data: contacts, isLoading, createMutation, updateMutation, deleteMutation } =
    useEmergencyContacts();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [detailContact, setDetailContact] = useState<
    (EmergencyContactFormInput & { id: string; email?: string; createdAt?: string }) | null
  >(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EmergencyContactFormInput>({
    resolver: zodResolver(emergencyContactFormSchema),
    defaultValues: defaultFormValues,
  });

  const filteredContacts = contacts?.filter(
    (c: { name: string; phone: string }) =>
      !searchQuery ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  );

  const openAddForm = () => {
    setEditingId(null);
    reset(defaultFormValues);
    setShowForm(true);
  };

  const onSubmit = async (data: EmergencyContactFormInput) => {
    const payload = toEmergencyContactPayload(data);
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, data: payload });
        toast.success("Contact updated");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(
          navigator.onLine ? "Contact added" : "Contact saved offline — will sync when online"
        );
      }
      reset(defaultFormValues);
      setShowForm(false);
      setEditingId(null);
    } catch (error) {
      if (error instanceof Error && error.message === "OFFLINE_QUEUED") {
        toast.success("Contact saved offline — will sync when online");
        reset(defaultFormValues);
        setShowForm(false);
        setEditingId(null);
        return;
      }
      toast.error(error instanceof Error ? error.message : "Failed to save");
    }
  };

  const onInvalid = () => {
    toast.error("Please fix the form errors before saving");
  };

  const handleEdit = (contact: EmergencyContactFormInput & { id: string }) => {
    setEditingId(contact.id);
    setShowForm(true);
    reset({
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship ?? "",
      priority: contact.priority ?? 1,
      isFavorite: contact.isFavorite ?? false,
      notifyOnSos: contact.notifyOnSos ?? true,
      notifyOnCheckin: contact.notifyOnCheckin ?? false,
      notifyOnJourney: contact.notifyOnJourney ?? false,
    });
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Contact removed");
    } catch {
      toast.error("Failed to remove contact");
    }
  };

  const handleImport = async () => {
    try {
      if ("contacts" in navigator && "ContactsManager" in window) {
        const props = ["name", "tel"];
        const selected = await (
          navigator as Navigator & {
            contacts: { select: (props: string[], opts: { multiple: boolean }) => Promise<Array<{ name?: string[]; tel?: string[] }>> };
          }
        ).contacts.select(props, { multiple: true });

        for (const entry of selected) {
          const name = entry.name?.[0] ?? "Contact";
          const phone = entry.tel?.[0] ?? "";
          if (!phone) continue;
          await createMutation.mutateAsync(
            toEmergencyContactPayload({ name, phone, isFavorite: false, notifyOnSos: true })
          );
        }
        toast.success(`Imported ${selected.length} contact(s)`);
        return;
      }
      toast.error("Contact import not supported on this browser");
    } catch {
      toast.error("Import cancelled or failed");
    }
  };

  return (
    <div className="pb-4">
      <div className="flex items-center gap-3 px-5 pt-6">
        <Link href="/safety">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Emergency Contacts</h1>
        </div>
        <Button size="icon" onClick={openAddForm}>
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      <div className="space-y-4 px-5 pt-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Button variant="outline" className="w-full" onClick={handleImport}>
          Import from Device
        </Button>

        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card>
                <CardContent className="space-y-3 p-4">
                  <form
                    onSubmit={handleSubmit(onSubmit, onInvalid)}
                    className="space-y-3"
                  >
                    <div>
                      <Label>Name *</Label>
                      <Input {...register("name")} placeholder="Contact name" />
                      {errors.name && (
                        <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
                      )}
                    </div>
                    <div>
                      <Label>Phone *</Label>
                      <Input
                        {...register("phone")}
                        type="tel"
                        placeholder="9876543210 or +91 98765 43210"
                      />
                      {errors.phone && (
                        <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>
                      )}
                    </div>
                    <div>
                      <Label>Relationship</Label>
                      <Input {...register("relationship")} placeholder="Mother, Friend..." />
                    </div>
                    <div>
                      <Label>Priority (1 = highest)</Label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        {...register("priority", { valueAsNumber: true })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Favorite</Label>
                      <Switch
                        checked={watch("isFavorite") ?? false}
                        onCheckedChange={(v) => setValue("isFavorite", v)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Notify on SOS</Label>
                      <Switch
                        checked={watch("notifyOnSos") ?? true}
                        onCheckedChange={(v) => setValue("notifyOnSos", v)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        className="flex-1"
                        disabled={createMutation.isPending || updateMutation.isPending}
                      >
                        {editingId ? "Update" : "Add Contact"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowForm(false);
                          setEditingId(null);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : filteredContacts?.length > 0 ? (
          filteredContacts.map((contact: EmergencyContactFormInput & { id: string; email?: string; createdAt?: string }) => (
            <Card
              key={contact.id}
              className="cursor-pointer"
              onClick={() => setDetailContact(contact)}
            >
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                  {contact.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="font-medium truncate">{contact.name}</p>
                    {contact.isFavorite && (
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {contact.phone}
                  </p>
                  {contact.relationship && (
                    <p className="text-xs text-muted-foreground">{contact.relationship}</p>
                  )}
                </div>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(contact)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(contact.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">No emergency contacts yet</p>
            <Button className="mt-4" onClick={openAddForm}>
              Add Your First Contact
            </Button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {detailContact && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end bg-black/50"
            onClick={() => setDetailContact(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="w-full rounded-t-2xl bg-background p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-xl font-semibold text-primary">
                  {detailContact.name.charAt(0)}
                </div>
                <div>
                  <p className="text-lg font-semibold">{detailContact.name}</p>
                  {detailContact.isFavorite && (
                    <p className="text-xs text-amber-500">★ Favorite</p>
                  )}
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone</span>
                  <a href={`tel:${detailContact.phone}`} className="font-medium text-primary">
                    {detailContact.phone}
                  </a>
                </div>
                {detailContact.relationship && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Relationship</span>
                    <span>{detailContact.relationship}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Priority</span>
                  <span>{detailContact.priority ?? 1}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Notify on SOS</span>
                  <span>{detailContact.notifyOnSos ? "Yes" : "No"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Notify on Journey</span>
                  <span>{detailContact.notifyOnJourney ? "Yes" : "No"}</span>
                </div>
              </div>
              <div className="mt-6 flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => {
                    handleEdit(detailContact);
                    setDetailContact(null);
                  }}
                >
                  Edit
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setDetailContact(null)}>
                  Close
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
