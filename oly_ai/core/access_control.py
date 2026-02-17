# Copyright (c) 2026, OLY Technologies and contributors
# Access Control — Role-based AI feature access

import frappe
from frappe import _

# Tier hierarchy: Admin > Power > Standard > Basic
TIER_LEVELS = {
	"Basic": 1,
	"Standard": 2,
	"Power": 3,
	"Admin": 4,
}

# Default permissions per tier
TIER_PERMISSIONS = {
	"Basic": {
		"allowed_modes": ["ask"],
		"can_query_data": False,
		"can_execute_actions": False,
		"can_use_agent_mode": False,
	},
	"Standard": {
		"allowed_modes": ["ask", "research"],
		"can_query_data": False,
		"can_execute_actions": False,
		"can_use_agent_mode": False,
	},
	"Power": {
		"allowed_modes": ["ask", "research", "agent"],
		"can_query_data": True,
		"can_execute_actions": False,
		"can_use_agent_mode": True,
	},
	"Admin": {
		"allowed_modes": ["ask", "research", "agent", "execute"],
		"can_query_data": True,
		"can_execute_actions": True,
		"can_use_agent_mode": True,
	},
}


def check_user_access(user=None):
	"""Check what AI features a user has access to.

	Returns the effective access level by taking the HIGHEST tier
	from all the user's roles.

	Args:
		user: Frappe user (default: current user)

	Returns:
		dict: {
			"tier": str,
			"allowed_modes": list,
			"can_query_data": bool,
			"can_execute_actions": bool,
			"can_use_agent_mode": bool,
			"max_daily_requests": int,
		}
	"""
	user = user or frappe.session.user

	# Administrator always gets full access
	if user == "Administrator":
		return {
			"tier": "Admin",
			"allowed_modes": ["ask", "research", "agent", "execute"],
			"can_query_data": True,
			"can_execute_actions": True,
			"can_use_agent_mode": True,
			"max_daily_requests": 0,  # unlimited
		}

	settings = frappe.get_cached_doc("AI Settings")

	# If access control is disabled, everyone gets full access
	if not settings.enable_access_control:
		return {
			"tier": "Admin",
			"allowed_modes": ["ask", "research", "agent", "execute"],
			"can_query_data": True,
			"can_execute_actions": True,
			"can_use_agent_mode": True,
			"max_daily_requests": 0,
		}

	# Get user's roles
	user_roles = set(frappe.get_roles(user))

	# Find the highest tier from the access_levels table
	highest_tier = "Basic"
	highest_level = 0
	can_query = False
	can_execute = False
	can_agent = False
	max_requests = 0

	for row in settings.get("access_levels", []):
		if row.role in user_roles:
			tier_level = TIER_LEVELS.get(row.access_tier, 1)
			if tier_level > highest_level:
				highest_level = tier_level
				highest_tier = row.access_tier

			# Union of all permissions from matching roles
			if row.can_query_data:
				can_query = True
			if row.can_execute_actions:
				can_execute = True
			if row.can_use_agent_mode:
				can_agent = True
			if row.max_daily_requests and row.max_daily_requests > max_requests:
				max_requests = row.max_daily_requests

	# If no matching roles found in the table, default to Basic
	if highest_level == 0:
		return {
			"tier": "Basic",
			"allowed_modes": ["ask"],
			"can_query_data": False,
			"can_execute_actions": False,
			"can_use_agent_mode": False,
			"max_daily_requests": 0,
		}

	# Compute allowed modes from tier + overrides
	tier_perms = TIER_PERMISSIONS.get(highest_tier, TIER_PERMISSIONS["Basic"])
	allowed_modes = list(tier_perms["allowed_modes"])

	# Apply per-row overrides
	if can_query and not tier_perms["can_query_data"]:
		can_query = True
	else:
		can_query = can_query or tier_perms["can_query_data"]

	if can_execute and not tier_perms["can_execute_actions"]:
		can_execute = True
	else:
		can_execute = can_execute or tier_perms["can_execute_actions"]

	if can_agent and "agent" not in allowed_modes:
		allowed_modes.append("agent")

	if can_execute and "execute" not in allowed_modes:
		allowed_modes.append("execute")

	return {
		"tier": highest_tier,
		"allowed_modes": allowed_modes,
		"can_query_data": can_query,
		"can_execute_actions": can_execute,
		"can_use_agent_mode": can_agent or "agent" in allowed_modes,
		"max_daily_requests": max_requests,
	}


def check_mode_access(user, mode):
	"""Check if a user can use a specific mode. Raises PermissionError if not.

	Args:
		user: Frappe user
		mode: Mode name (ask, research, agent, execute)
	"""
	access = check_user_access(user)

	if mode not in access["allowed_modes"]:
		frappe.throw(
			_("You don't have access to {0} mode. Your access tier is: {1}").format(
				mode.title(), access["tier"]
			),
			frappe.PermissionError,
		)

	return access


@frappe.whitelist()
def get_user_access():
	"""API endpoint to get the current user's AI access level.

	Returns:
		dict: Access information for the current user
	"""
	return check_user_access(frappe.session.user)
