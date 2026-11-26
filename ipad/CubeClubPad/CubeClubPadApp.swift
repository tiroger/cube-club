import SwiftUI

/// The iPad shell: one full-screen web view running the same teaching interface as the Mac app.
@main
struct CubeClubPadApp: App {
    var body: some Scene {
        WindowGroup {
            ClubWebView()
                .ignoresSafeArea(.container, edges: .bottom)
                .persistentSystemOverlays(.hidden)
        }
    }
}
