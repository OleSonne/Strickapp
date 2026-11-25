import SwiftUI

extension View {
    func errorAlert(_ message: Binding<String?>) -> some View {
        alert(
            "Das hat nicht geklappt",
            isPresented: Binding(
                get: { message.wrappedValue != nil },
                set: { if !$0 { message.wrappedValue = nil } }
            )
        ) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(message.wrappedValue ?? "")
        }
    }
}
