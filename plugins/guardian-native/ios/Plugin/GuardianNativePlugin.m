#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(GuardianNativePlugin, "GuardianNative",
    CAP_PLUGIN_METHOD(sendSmsAutomatic, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(placeCallAutomatic, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(requestEmergencyPermissions, CAPPluginReturnPromise);
)
