import UIKit
import Social

class ShareViewController: UIViewController {
  override func viewDidLoad() {
    super.viewDidLoad()
  }
  
  override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)
    let text = "test"
    var components = URLComponents(string: "tutanota:mailto")!
    components.queryItems = [URLQueryItem(name: "text", value: text)]
    let url = components.url!
    let opened = self.openURL(url)
    print("Opened \(url): \(opened)")
  }
  
  //  Function must be named exactly like this so a selector can be found by the compiler!
  //  Anyway - it's another selector in another instance that would be "performed" instead.
  @objc func openURL(_ url: URL) -> Bool {
    var responder: UIResponder? = self
    while responder != nil {
        if let application = responder as? UIApplication {
          return application.perform(#selector(openURL(_:)), with: url) != nil
        }
        responder = responder?.next
      }
      return false
    }
}
