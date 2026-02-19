# rrpairing: iOS Self-Connection Test

An experimental test utilizing `rrpairing` to enable an iOS device to establish a connection to itself. This implementation uses the [`rppairing-try2` branch](https://github.com/jkcoxson/idevice/tree/rppairing-try2) from jkcoxson's `idevice` repository.

## Pros
* **Current Compatibility:** Successfully tested and working on the iOS 26.4 Developer Beta 1.
* **Improved Performance:** Demonstrates noticeably faster speeds compared to previous self-connection methods.
* **Ecosystem Support:** Includes out-of-the-box compatibility with Apple TV (untested).

## Limitations
* **Loopback VPN Required:** Because iOS natively refuses direct self-connections, a loopback VPN (such as `LocalDevVpn`) is still mandatory to route the traffic.
* **Network Restrictions:** Cellular connections are currently unsupported.
