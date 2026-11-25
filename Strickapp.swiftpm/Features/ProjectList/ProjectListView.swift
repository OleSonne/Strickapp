import SwiftUI

struct ProjectListView: View {
    var body: some View {
        ContentUnavailableView(
            "Noch keine Projekte",
            systemImage: "tray",
            description: Text("Hier erscheinen später deine Strickprojekte.")
        )
        .navigationTitle("Projekte")
    }
}

#Preview {
    NavigationStack {
        ProjectListView()
    }
}
