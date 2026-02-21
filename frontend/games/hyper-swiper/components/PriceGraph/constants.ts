/**
 * Constants for PriceGraph component
 * Matches the existing Tron-style theme
 */

import type { GraphColors, GraphConfig, BufferConfig } from './types'

/**
 * Color palette matching the game's Tron-style theme
 */
export const GRAPH_COLORS: GraphColors = {
	// Line styling
	lineColor: '#00f3ff',
	lineWidth: 2,

	// Area gradient (for optional area series)
	areaTopColor: 'rgba(0, 243, 255, 0.4)',
	areaBottomColor: 'rgba(0, 243, 255, 0.05)',

	// Grid lines
	gridLineColor: 'rgba(0, 243, 255, 0.08)',

	// Axis styling
	axisColor: 'rgba(0, 243, 255, 0.2)',
	textColor: 'rgba(0, 243, 255, 0.6)',

	// Background (transparent to show game background)
	background: 'transparent',
}

/**
 * Buffer configuration
 * Max size accommodates 3+ minutes of 100ms updates
 */
export const BUFFER_CONFIG: BufferConfig = {
	maxSize: 2000, // 200 seconds at 100ms intervals
}

/**
 * Graph configuration
 */
export const GRAPH_CONFIG: GraphConfig = {
	maxVisiblePoints: 500, // Show last 50 seconds
	updateThrottleMs: 100, // Match server update rate
}

/**
 * Calculate graph dimensions based on viewport
 */
export function getGraphDimensions(viewportWidth: number, viewportHeight: number) {
	return {
		height: Math.max(80, Math.min(120, viewportHeight * 0.12)),
		marginBottom: 4,
	}
}
