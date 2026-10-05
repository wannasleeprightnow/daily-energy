package handler

import (
	"testing"
	"time"

	"github.com/isiyar/daily-energy/backend/internal/domain/models"
)

func TestPlanDatesFollowLocalCalendarAcrossDST(t *testing.T) {
	location, err := time.LoadLocation("America/New_York")
	if err != nil {
		t.Fatal(err)
	}
	// DST begins on March 8, 2026. The local dates must remain consecutive
	// even though that calendar day is only 23 hours long.
	now := time.Date(2026, time.March, 7, 12, 0, 0, 0, location)
	dates := planDates(now, location)
	if len(dates) != 7 {
		t.Fatalf("expected 7 dates, got %d", len(dates))
	}
	if got := dates[2].Sub(dates[1]); got != 23*time.Hour {
		t.Fatalf("expected 23-hour DST transition, got %s", got)
	}
	for i, date := range dates {
		want := time.Date(2026, time.March, 7+i, 0, 0, 0, 0, location)
		if !date.Equal(want) {
			t.Errorf("date %d: expected %s, got %s", i, want, date)
		}
	}
}

func TestProfileChangeMarksFuturePlansStaleButPreservesToday(t *testing.T) {
	today := int64(1_800_000_000)
	tomorrow := today + 86_400
	daySet := map[int64]bool{today: true, tomorrow: true}
	plans := []models.Plan{
		{Date: today, ProfileHash: "old"},
		{Date: tomorrow, ProfileHash: "old"},
	}
	if !hasStaleFuturePlans(plans, daySet, today, "new") {
		t.Fatal("profile change should mark a future plan for regeneration")
	}
	plans[1].ProfileHash = "new"
	if hasStaleFuturePlans(plans, daySet, today, "new") {
		t.Fatal("plans matching the current profile should not be regenerated")
	}
	if hasStaleFuturePlans(plans[:1], daySet, today, "new") {
		t.Fatal("a stale plan for today must not trigger regeneration")
	}
}

func TestProfileHashIncludesPlanGenerationCharacteristics(t *testing.T) {
	location, err := time.LoadLocation("Asia/Yekaterinburg")
	if err != nil {
		t.Fatal(err)
	}
	now := time.Date(2026, time.October, 5, 12, 0, 0, 0, location)
	base := models.User{
		Gender: models.Female, DateofBirth: time.Date(1990, time.June, 1, 0, 0, 0, 0, location).Unix(),
		Weight: 70, Height: 165, Goal: models.Maintain, PhysicalActivity: models.Medium,
	}
	baseHash := profileHash(base, now, location.String())
	variants := []models.User{
		{Gender: models.Male, DateofBirth: base.DateofBirth, Weight: base.Weight, Height: base.Height, Goal: base.Goal, PhysicalActivity: base.PhysicalActivity},
		{Gender: base.Gender, DateofBirth: base.DateofBirth + 86_400, Weight: base.Weight, Height: base.Height, Goal: base.Goal, PhysicalActivity: base.PhysicalActivity},
		{Gender: base.Gender, DateofBirth: base.DateofBirth, Weight: 71, Height: base.Height, Goal: base.Goal, PhysicalActivity: base.PhysicalActivity},
		{Gender: base.Gender, DateofBirth: base.DateofBirth, Weight: base.Weight, Height: 166, Goal: base.Goal, PhysicalActivity: base.PhysicalActivity},
		{Gender: base.Gender, DateofBirth: base.DateofBirth, Weight: base.Weight, Height: base.Height, Goal: models.LoseWeight, PhysicalActivity: base.PhysicalActivity},
		{Gender: base.Gender, DateofBirth: base.DateofBirth, Weight: base.Weight, Height: base.Height, Goal: base.Goal, PhysicalActivity: models.High},
	}
	for i, variant := range variants {
		if got := profileHash(variant, now, location.String()); got == baseHash {
			t.Errorf("generation characteristic variant %d did not change profile hash", i)
		}
	}
}

func TestPlanDatesStartAtLocalMidnight(t *testing.T) {
	location, err := time.LoadLocation("Asia/Yekaterinburg")
	if err != nil {
		t.Fatal(err)
	}
	dates := planDates(time.Date(2026, time.October, 5, 23, 59, 0, 0, location), location)
	if dates[0].Hour() != 0 || dates[0].Minute() != 0 || len(dates) != planHorizonDays {
		t.Fatalf("expected seven dates starting at local midnight, got %#v", dates)
	}
}
