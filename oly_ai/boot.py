import frappe


def extend_bootinfo(bootinfo):
	"""Pass AI branding colors to the frontend via frappe.boot."""
	try:
		settings = frappe.get_single("AI Settings")
		bootinfo.oly_ai_brand = {
			"color_from": settings.brand_color_from or "#f97316",
			"color_to": settings.brand_color_to or "#ea580c",
		}
	except Exception:
		bootinfo.oly_ai_brand = {
			"color_from": "#f97316",
			"color_to": "#ea580c",
		}
