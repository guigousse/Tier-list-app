# Local Expo module, found by autolinking in ./modules (no package.json needed).
# Not named "DeviceCheck": the pod's Swift module would hide Apple's framework of that name.
Pod::Spec.new do |s|
  s.name           = 'TiercraftDeviceCheck'
  s.version        = '1.0.0'
  s.summary        = "Apple's DeviceCheck token, so the server can keep 2 bits per device."
  s.description    = s.summary
  s.license        = 'UNLICENSED'
  s.author         = 'Tiercraft'
  s.homepage       = 'https://tiercraft.app'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'DeviceCheck'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,swift}"
end
