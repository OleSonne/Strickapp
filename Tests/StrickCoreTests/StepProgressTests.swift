import Testing
@testable import StrickCore

@Suite struct StepProgressTests {
    @Test func handlesEmptyProject() {
        var progress = StepProgress(stepCount: 0, completedCount: 4)
        progress.advance()
        progress.goBack()
        #expect(progress.completedCount == 0)
        #expect(progress.currentIndex == nil)
        #expect(progress.fraction == 0)
        #expect(!progress.isFinished)
    }

    @Test func clampsStoredValues() {
        #expect(StepProgress(stepCount: 3, completedCount: 9).completedCount == 3)
        #expect(StepProgress(stepCount: 3, completedCount: -1).completedCount == 0)
        #expect(StepProgress(stepCount: -2, completedCount: 0).stepCount == 0)
    }

    @Test func advancesToFinishAndBack() {
        var progress = StepProgress(stepCount: 2, completedCount: 0)
        progress.advance()
        #expect(progress.currentIndex == 1)
        #expect(progress.fraction == 0.5)
        progress.advance()
        progress.advance()
        #expect(progress.isFinished)
        progress.goBack()
        #expect(progress.currentIndex == 1)
    }

    @Test func keepsCurrentStepWhenEarlierStepIsDeleted() {
        let progress = StepProgress(stepCount: 3, completedCount: 1)
        #expect(progress.relocated(from: ["a", "b", "c"], to: ["b", "c"]).completedCount == 0)
    }

    @Test func movesToNextStepWhenCurrentIsDeleted() {
        let progress = StepProgress(stepCount: 3, completedCount: 1)
        #expect(progress.relocated(from: ["a", "b", "c"], to: ["a", "c"]).currentIndex == 1)
    }

    @Test func finishesWhenLastOpenStepIsDeleted() {
        let progress = StepProgress(stepCount: 2, completedCount: 1)
        #expect(progress.relocated(from: ["a", "b"], to: ["a"]).isFinished)
    }

    @Test func followsCurrentStepWhenMoved() {
        let progress = StepProgress(stepCount: 3, completedCount: 1)
        #expect(progress.relocated(from: ["a", "b", "c"], to: ["b", "a", "c"]).currentIndex == 0)
    }

    @Test func staysFinishedWhenReordered() {
        let progress = StepProgress(stepCount: 2, completedCount: 2)
        #expect(progress.relocated(from: ["a", "b"], to: ["b", "a"]).isFinished)
    }

    @Test func handlesDeletingEverything() {
        let progress = StepProgress(stepCount: 1, completedCount: 0)
        #expect(progress.relocated(from: ["a"], to: []).stepCount == 0)
    }
}

@Suite struct StepTextTests {
    @Test func splitsLinesAndDropsEmptyOnes() {
        #expect(StepText.split(" 6 M anschlagen \r\n\n  \n1 R rechts\n") == ["6 M anschlagen", "1 R rechts"])
    }

    @Test func returnsNothingForBlankText() {
        #expect(StepText.split(" \n ").isEmpty)
    }
}
