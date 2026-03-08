from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        print("Navigating to app...")
        page.goto("http://localhost:5000/")

        # Wait for loading to finish and names to appear
        print("Waiting for content...")
        page.wait_for_selector('text="Choose Your Contenders"', timeout=10000)

        is_swipe = page.locator('text="Swipe right to select"').is_visible()
        print(f"Initial mode: {'Swipe' if is_swipe else 'Grid'}")

        print("Pressing Tab to navigate...")
        page.focus("body")

        found_zoom = False
        for i in range(20):
            page.keyboard.press("Tab")
            focused_el = page.evaluate("document.activeElement")
            label = page.evaluate("document.activeElement.getAttribute('aria-label')")
            tag = page.evaluate("document.activeElement.tagName")
            print(f"Tab {i+1}: Focused {tag} with label '{label}'")

            if label == "View full size":
                print("Found Zoom button!")
                found_zoom = True
                break

        if found_zoom:
            # Wait for transition
            time.sleep(1)

            # Check opacity style
            opacity = page.evaluate("window.getComputedStyle(document.activeElement).opacity")
            print(f"Zoom button opacity: {opacity}")

            # Take screenshot of focused state
            page.screenshot(path="verification_zoom_focus.png")
            print("Screenshot saved to verification_zoom_focus.png")

            if float(opacity) > 0.9:
                print("SUCCESS: Zoom button is visible on focus!")
            else:
                print("FAILURE: Zoom button is NOT visible on focus (opacity < 0.9)")
        else:
            print("FAILURE: Could not tab to Zoom button.")

    except Exception as e:
        print(f"Error: {e}")
        page.screenshot(path="verification_error.png")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
