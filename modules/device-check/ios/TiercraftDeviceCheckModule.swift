import DeviceCheck
import ExpoModulesCore

public class TiercraftDeviceCheckModule: Module {
  public func definition() -> ModuleDefinition {
    Name("TiercraftDeviceCheck")

    // A function, not a constant: the simulator and some old devices answer false.
    Function("isSupported") { () -> Bool in
      return DCDevice.current.isSupported
    }

    // A fresh token per call: Apple ties it to this device and this app's team, it survives
    // reinstalls through the 2 bits the server keeps for the device.
    AsyncFunction("generateTokenAsync") { () async throws -> String in
      let token = try await DCDevice.current.generateToken()
      return token.base64EncodedString()
    }
  }
}
