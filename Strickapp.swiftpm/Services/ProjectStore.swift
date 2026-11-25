import Foundation
import Observation
import SwiftData

/// Alle Änderungen an Projekten. Jede Änderung wird sofort gespeichert.
@MainActor
@Observable
final class ProjectStore {
    @ObservationIgnored private let context: ModelContext

    init(context: ModelContext) {
        self.context = context
    }

    func createProject(named name: String) throws -> Project? {
        guard let name = cleaned(name) else { return nil }
        let project = Project(name: name)
        context.insert(project)
        try save()
        return project
    }

    func rename(_ project: Project, to name: String) throws {
        guard let name = cleaned(name) else { return }
        project.name = name
        try saveChange(to: project)
    }

    func delete(_ project: Project) throws {
        context.delete(project)
        try save()
    }

    func addSteps(_ texts: [String], to project: Project) throws {
        guard !texts.isEmpty else { return }
        let start = (project.steps.map(\.order).max() ?? -1) + 1
        for (offset, text) in texts.enumerated() {
            let step = ProjectStep(text: text, order: start + offset)
            context.insert(step)
            step.project = project
        }
        try saveChange(to: project)
    }

    func update(_ step: ProjectStep, text: String, in project: Project) throws {
        guard let text = cleaned(text) else { return }
        step.text = text
        try saveChange(to: project)
    }

    func deleteSteps(at offsets: IndexSet, from project: Project) throws {
        let old = project.orderedSteps
        let removed = offsets.map { old[$0] }
        let remaining = old.enumerated().filter { !offsets.contains($0.offset) }.map(\.element)
        let newProgress = project.progress.relocated(
            from: old.map(\.identifier), to: remaining.map(\.identifier)
        )
        project.steps = remaining
        removed.forEach(context.delete)
        renumber(remaining)
        project.completedStepCount = newProgress.completedCount
        try saveChange(to: project)
    }

    /// `newOrder` enthält alle Schritte des Projekts in neuer Reihenfolge.
    func reorder(_ newOrder: [ProjectStep], in project: Project) throws {
        let newProgress = project.progress.relocated(
            from: project.orderedSteps.map(\.identifier), to: newOrder.map(\.identifier)
        )
        renumber(newOrder)
        project.completedStepCount = newProgress.completedCount
        try saveChange(to: project)
    }

    func advance(_ project: Project) throws {
        var progress = project.progress
        progress.advance()
        project.completedStepCount = progress.completedCount
        try saveChange(to: project)
    }

    func goBack(_ project: Project) throws {
        var progress = project.progress
        progress.goBack()
        project.completedStepCount = progress.completedCount
        try saveChange(to: project)
    }

    private func renumber(_ steps: [ProjectStep]) {
        for (index, step) in steps.enumerated() {
            step.order = index
        }
    }

    private func cleaned(_ text: String) -> String? {
        let text = text.trimmingCharacters(in: .whitespacesAndNewlines)
        return text.isEmpty ? nil : text
    }

    private func saveChange(to project: Project) throws {
        project.updatedAt = .now
        try save()
    }

    /// Schlägt das Speichern fehl, zeigt die App wieder den gespeicherten Stand.
    private func save() throws {
        do {
            try context.save()
        } catch {
            context.rollback()
            throw error
        }
    }
}
