import SwiftData
import SwiftUI

@main
struct StrickappApp: App {
    private let storage: Storage

    private enum Storage {
        case ready(ModelContainer, ProjectStore)
        case failed(String)
    }

    init() {
        do {
            let container = try ModelContainer(for: Project.self, ProjectStep.self)
            storage = .ready(container, ProjectStore(context: container.mainContext))
        } catch {
            storage = .failed(error.localizedDescription)
        }
    }

    var body: some Scene {
        WindowGroup {
            switch storage {
            case .ready(let container, let store):
                RootView()
                    .modelContainer(container)
                    .environment(store)
            case .failed(let message):
                ContentUnavailableView(
                    "Projekte konnten nicht geladen werden",
                    systemImage: "exclamationmark.triangle",
                    description: Text(message)
                )
            }
        }
    }
}
