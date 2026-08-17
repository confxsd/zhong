import SwiftUI
import UIKit

enum Theme {
    static let accent = Color(uiColor: UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0.878, green: 0.322, blue: 0.302, alpha: 1) // #e0524d
            : UIColor(red: 0.757, green: 0.227, blue: 0.169, alpha: 1) // #c13a2b
    })

    static let accentStrong = Color(uiColor: UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0.929, green: 0.435, blue: 0.416, alpha: 1) // #ed6f6a
            : UIColor(red: 0.620, green: 0.169, blue: 0.122, alpha: 1) // #9e2b1f
    })

    static let accentSoft = Color(uiColor: UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0.263, green: 0.125, blue: 0.122, alpha: 1) // #43201f
            : UIColor(red: 0.976, green: 0.914, blue: 0.898, alpha: 1) // #f9e9e5
    })

    static let jade = Color(uiColor: UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0.263, green: 0.698, blue: 0.541, alpha: 1) // #43b28a
            : UIColor(red: 0.090, green: 0.478, blue: 0.345, alpha: 1) // #177a58
    })

    static let amber = Color(uiColor: UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0.847, green: 0.663, blue: 0.310, alpha: 1) // #d8a94f
            : UIColor(red: 0.651, green: 0.486, blue: 0.118, alpha: 1) // #a67c1e
    })

    static let ink = Color(uiColor: UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0.933, green: 0.906, blue: 0.875, alpha: 1) // #eee7df
            : UIColor(red: 0.125, green: 0.106, blue: 0.090, alpha: 1) // #201b17
    })

    static let paper = Color(uiColor: UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0.075, green: 0.067, blue: 0.063, alpha: 1) // #131110
            : UIColor(red: 0.965, green: 0.949, blue: 0.925, alpha: 1) // #f6f2ec
    })
}
