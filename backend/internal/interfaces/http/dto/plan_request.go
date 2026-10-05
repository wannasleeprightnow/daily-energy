package dto

type PlanRequest struct {
	// Date is accepted for backwards compatibility; the server anchors plans to
	// the current local calendar day so clients cannot request arbitrary dates.
	Date     int64  `json:"date"`
	Timezone string `json:"timezone"`
}
