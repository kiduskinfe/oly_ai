import frappe


def extend_bootinfo(bootinfo):
	"""Pass AI branding colors to the frontend via frappe.boot."""
	try:
		settings = frappe.get_single("AI Settings")
		bootinfo.oly_ai_brand = {
			"color_from": settings.brand_color_from or "#f97316",
			"color_to": settings.brand_color_to or "#ea580c",
			"apply_to_header": bool(settings.apply_brand_to_header),
			"apply_to_navbar": bool(settings.apply_brand_to_navbar),
		}
	except Exception:
		bootinfo.oly_ai_brand = {
			"color_from": "#f97316",
			"color_to": "#ea580c",
			"apply_to_header": False,
			"apply_to_navbar": False,
		}
