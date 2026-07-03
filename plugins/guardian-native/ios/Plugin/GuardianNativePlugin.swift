import Foundation
import Capacitor
import MessageUI

@objc(GuardianNativePlugin)
public class GuardianNativePlugin: CAPPlugin, CAPBridgedPlugin, MFMessageComposeViewControllerDelegate {
    public let identifier = "GuardianNativePlugin"
    public let jsName = "GuardianNative"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "sendSmsAutomatic", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "placeCallAutomatic", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestEmergencyPermissions", returnType: CAPPluginReturnPromise)
    ]

    private var pendingSmsCall: CAPPluginCall?

    @objc func requestEmergencyPermissions(_ call: CAPPluginCall) {
        call.resolve([
            "sms": MFMessageComposeViewController.canSendText(),
            "phone": true
        ])
    }

    @objc func sendSmsAutomatic(_ call: CAPPluginCall) {
        guard MFMessageComposeViewController.canSendText() else {
            call.reject("SMS not available on this device")
            return
        }

        guard let numbers = call.getArray("numbers") as? [String],
              let text = call.getString("text"),
              !numbers.isEmpty else {
            call.reject("numbers and text are required")
            return
        }

        DispatchQueue.main.async {
            let controller = MFMessageComposeViewController()
            controller.messageComposeDelegate = self
            controller.recipients = numbers
            controller.body = text
            self.pendingSmsCall = call
            self.bridge?.viewController?.present(controller, animated: true)
        }
    }

    public func messageComposeViewController(
        _ controller: MFMessageComposeViewController,
        didFinishWith result: MessageComposeResult
    ) {
        controller.dismiss(animated: true)
        guard let call = pendingSmsCall else { return }
        pendingSmsCall = nil

        switch result {
        case .sent:
            call.resolve(["sent": 1, "automatic": true])
        case .cancelled:
            call.reject("SMS cancelled")
        case .failed:
            call.reject("SMS failed to send")
        @unknown default:
            call.reject("Unknown SMS result")
        }
    }

    @objc func placeCallAutomatic(_ call: CAPPluginCall) {
        guard let number = call.getString("number"), !number.isEmpty else {
            call.reject("number is required")
            return
        }

        let cleaned = number.replacingOccurrences(of: " ", with: "")
        guard let url = URL(string: "tel://\(cleaned)") else {
            call.reject("Invalid phone number")
            return
        }

        DispatchQueue.main.async {
            UIApplication.shared.open(url, options: [:]) { success in
                if success {
                    call.resolve(["placed": true, "automatic": true])
                } else {
                    call.reject("Could not place call")
                }
            }
        }
    }
}
