import SwiftData
import SwiftUI

struct ProjectDetailView: View {
    @Environment(ProjectStore.self) private var store
    let project: Project

    @State private var isAdding = false
    @State private var editedStep: ProjectStep?
    @State private var errorMessage: String?

    var body: some View {
        let steps = project.orderedSteps
        let progress = project.progress

        List {
            ForEach(Array(steps.enumerated()), id: \.element.identifier) { index, step in
                Button { editedStep = step } label: {
                    StepRow(number: index + 1, text: step.text, state: state(of: index, in: progress))
                }
                .buttonStyle(.plain)
                .accessibilityHint("Schritt bearbeiten")
            }
            .onDelete { offsets in
                perform { try store.deleteSteps(at: offsets, from: project) }
            }
            .onMove { source, destination in
                var newOrder = project.orderedSteps
                newOrder.move(fromOffsets: source, toOffset: destination)
                perform { try store.reorder(newOrder, in: project) }
            }
        }
        .overlay {
            if steps.isEmpty {
                ContentUnavailableView(
                    "Noch keine Schritte",
                    systemImage: "list.number",
                    description: Text("Tippe auf +, um Schritte einzugeben.")
                )
            }
        }
        .navigationTitle(project.name)
        .toolbar {
            ToolbarItemGroup(placement: .topBarTrailing) {
                if !steps.isEmpty { EditButton() }
                Button("Schritte hinzufügen", systemImage: "plus") { isAdding = true }
            }
        }
        .safeAreaInset(edge: .bottom) {
            if !steps.isEmpty { controls(progress) }
        }
        .sheet(isPresented: $isAdding) {
            StepEditorView(title: "Schritte hinzufügen", hint: "Jede Zeile wird ein Schritt.") { text in
                try store.addSteps(StepText.split(text), to: project)
            }
        }
        .sheet(item: $editedStep) { step in
            StepEditorView(title: "Schritt bearbeiten", text: step.text) { text in
                try store.update(step, text: text, in: project)
            }
        }
        .errorAlert($errorMessage)
    }

    private func controls(_ progress: StepProgress) -> some View {
        HStack(spacing: 16) {
            Button { perform { try store.goBack(project) } } label: {
                Label("Zurück", systemImage: "arrow.uturn.backward")
                    .frame(maxWidth: .infinity, minHeight: 56)
            }
            .buttonStyle(.bordered)
            .disabled(!progress.canGoBack)

            Button { perform { try store.advance(project) } } label: {
                Label(
                    progress.isFinished ? "Fertig" : "Schritt erledigt",
                    systemImage: "checkmark"
                )
                .frame(maxWidth: .infinity, minHeight: 56)
            }
            .buttonStyle(.borderedProminent)
            .disabled(!progress.canAdvance)
        }
        .font(.title3)
        .padding()
        .background(.bar)
    }

    private func state(of index: Int, in progress: StepProgress) -> StepRow.State {
        if index < progress.completedCount { return .done }
        return index == progress.currentIndex ? .current : .open
    }

    private func perform(_ action: () throws -> Void) {
        do { try action() } catch { errorMessage = error.localizedDescription }
    }
}

private struct StepRow: View {
    enum State {
        case done, current, open

        var symbol: String {
            switch self {
            case .done: "checkmark.circle.fill"
            case .current: "arrow.right.circle.fill"
            case .open: "circle"
            }
        }

        var label: String {
            switch self {
            case .done: "Erledigt"
            case .current: "Aktueller Schritt"
            case .open: "Offen"
            }
        }
    }

    let number: Int
    let text: String
    let state: State

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 12) {
            Image(systemName: state.symbol)
                .foregroundStyle(state == .open ? Color.secondary : Color.accentColor)
                .accessibilityLabel(state.label)
            Text("\(number).")
                .foregroundStyle(.secondary)
                .monospacedDigit()
            Text(text)
                .fontWeight(state == .current ? .semibold : .regular)
                .foregroundStyle(state == .done ? Color.secondary : Color.primary)
            Spacer(minLength: 0)
        }
        .frame(minHeight: 44)
        .contentShape(Rectangle())
        .accessibilityElement(children: .combine)
    }
}
