package dto

import (
	"testing"

	"github.com/isiyar/daily-energy/backend/internal/domain/models"
	"github.com/isiyar/daily-energy/backend/pkg/validator"
)

func TestProfileAndWeightHistoryMeasurementLimits(t *testing.T) {
	type measurements struct {
		weight int
		height int
	}

	accepted := []measurements{
		{weight: 30, height: 100},
		{weight: 300, height: 250},
		{weight: 31, height: 101},
		{weight: 299, height: 249},
	}
	rejected := []measurements{
		{weight: 29, height: 100},
		{weight: 301, height: 100},
		{weight: 30, height: 99},
		{weight: 30, height: 251},
	}

	dtoFactories := map[string]func(measurements) any{
		"user create": func(m measurements) any {
			return UserCreate{
				Utgid: 1, Name: "Test", DateofBirth: 1,
				Weight: m.weight, Height: m.height,
			}
		},
		"user update": func(m measurements) any {
			return UserRequest{
				Name: "Test", Gender: models.Male, DateofBirth: 1,
				Weight: m.weight, Height: m.height,
				Goal: models.Maintain, PhysicalActivity: models.Low,
			}
		},
		"weight history create": func(m measurements) any {
			return UserWeightHistoryCreate{Date: 1, Weight: m.weight, Height: m.height}
		},
	}

	for name, newDTO := range dtoFactories {
		t.Run(name, func(t *testing.T) {
			for _, value := range accepted {
				if err := validator.Struct(newDTO(value)); err != nil {
					t.Errorf("expected weight=%d height=%d to be valid, got %v", value.weight, value.height, err)
				}
			}
			for _, value := range rejected {
				if err := validator.Struct(newDTO(value)); err == nil {
					t.Errorf("expected weight=%d height=%d to be invalid", value.weight, value.height)
				}
			}
		})
	}
}
