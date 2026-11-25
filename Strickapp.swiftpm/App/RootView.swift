import SwiftData
import SwiftUI

struct RootView: View {
    @Query private var projects: [Project]
    @State private var selection: PersistentIdentifier?

    private var selectedProject: Project? {
        projects.first { $0.persistentModelID == selection }
    }

    var body: some View {
        NavigationSplitView {
            ProjectListView(selection: $selection)
        } detail: {
            if let selectedProject {
                NavigationStack {
                    ProjectDetailView(project: selectedProject)
                }
                .id(selectedProject.persistentModelID)
            } else {
                ContentUnavailableView(
                    "Kein Projekt ausgewählt",
                    systemImage: "square.stack",
                    description: Text("Wähle ein Projekt aus oder lege ein neues an.")
                )
            }
        }
    }
}
