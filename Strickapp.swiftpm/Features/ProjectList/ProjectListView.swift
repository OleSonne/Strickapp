import SwiftData
import SwiftUI

struct ProjectListView: View {
    @Environment(ProjectStore.self) private var store
    @Query(sort: \Project.updatedAt, order: .reverse) private var projects: [Project]
    @Binding var selection: PersistentIdentifier?

    @State private var isCreating = false
    @State private var isRenaming = false
    @State private var isDeleting = false
    @State private var target: Project?
    @State private var name = ""
    @State private var errorMessage: String?

    var body: some View {
        List(selection: $selection) {
            ForEach(projects) { project in
                NavigationLink(value: project.persistentModelID) {
                    ProjectRow(project: project)
                }
                .swipeActions {
                    Button("Löschen") { askToDelete(project) }
                        .tint(.red)
                }
                .contextMenu {
                    Button("Umbenennen", systemImage: "pencil") { askToRename(project) }
                    Button("Löschen", systemImage: "trash", role: .destructive) {
                        askToDelete(project)
                    }
                }
            }
        }
        .overlay {
            if projects.isEmpty {
                ContentUnavailableView(
                    "Noch keine Projekte",
                    systemImage: "tray",
                    description: Text("Tippe auf +, um ein Projekt anzulegen.")
                )
            }
        }
        .navigationTitle("Projekte")
        .toolbar {
            Button("Neues Projekt", systemImage: "plus") {
                name = ""
                isCreating = true
            }
        }
        .alert("Neues Projekt", isPresented: $isCreating) {
            TextField("Name", text: $name)
            Button("Anlegen", action: create)
            Button("Abbrechen", role: .cancel) {}
        }
        .alert("Projekt umbenennen", isPresented: $isRenaming, presenting: target) { project in
            TextField("Name", text: $name)
            Button("Sichern") { perform { try store.rename(project, to: name) } }
            Button("Abbrechen", role: .cancel) {}
        }
        .alert("Projekt löschen?", isPresented: $isDeleting, presenting: target) { project in
            Button("Löschen", role: .destructive) { delete(project) }
            Button("Abbrechen", role: .cancel) {}
        } message: { project in
            Text("„\(project.name)“ wird mit allen Schritten und dem Fortschritt gelöscht.")
        }
        .errorAlert($errorMessage)
    }

    private func askToRename(_ project: Project) {
        target = project
        name = project.name
        isRenaming = true
    }

    private func askToDelete(_ project: Project) {
        target = project
        isDeleting = true
    }

    private func create() {
        perform {
            if let project = try store.createProject(named: name) {
                selection = project.persistentModelID
            }
        }
    }

    private func delete(_ project: Project) {
        if selection == project.persistentModelID { selection = nil }
        target = nil
        perform { try store.delete(project) }
    }

    private func perform(_ action: () throws -> Void) {
        do { try action() } catch { errorMessage = error.localizedDescription }
    }
}

private struct ProjectRow: View {
    let project: Project

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(project.name)
                .font(.headline)
            ProgressView(value: project.progress.fraction)
                .accessibilityHidden(true)
            Text(statusText)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 4)
        .accessibilityElement(children: .combine)
    }

    private var statusText: String {
        let progress = project.progress
        if progress.stepCount == 0 { return "Noch keine Schritte" }
        if progress.isFinished { return "Fertig" }
        return "\(progress.completedCount) von \(progress.stepCount) Schritten erledigt"
    }
}
