package events

import (
	"encoding/json"

	"github.com/rs/zerolog/log"
)

type Dispatcher struct{}

func NewDispatcher() *Dispatcher {
	return &Dispatcher{}
}

func (d *Dispatcher) Dispatch(rawPayload []byte) (*Event, error) {
	var event Event
	if err := json.Unmarshal(rawPayload, &event); err != nil {
		log.Error().Err(err).Msg("Failed to unmarshal event payload")
		return nil, err
	}

	return &event, nil
}
