import SwiftUI

struct RootView: View {
    var body: some View {
        NavigationSplitView {
            ProjectListView()
        } detail: {
            ContentUnavailableView(
                "Kein Projekt ausgewählt",
                systemImage: "square.stack",
                description: Text("Wähle links ein Projekt aus.")
            )
        }
    }
}

#Preview {
    RootView()
}
