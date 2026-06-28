import api from "./api"

export type EventType = "feature_discovery" | "feature_engagement" | "feature_abandonment" | "feature_return"

export const trackEvent = async (eventType: EventType, featureId: string, metadata?: Record<string, any>) => {
  try {
    await api.post("/api/analytics/event", {
      event_type: eventType,
      feature_id: featureId,
      metadata: metadata || {},
    })
  } catch (error) {
    console.error("[Analytics] Failed to track event:", error)
  }
}
