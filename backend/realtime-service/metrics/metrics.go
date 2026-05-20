package metrics

import "sync/atomic"

var (
	EventsReceivedTotal    int64
	EventsDispatchedTotal   int64
	MessageSendErrorsTotal int64
)

func IncrementEventsReceived() {
	atomic.AddInt64(&EventsReceivedTotal, 1)
}

func IncrementEventsDispatched() {
	atomic.AddInt64(&EventsDispatchedTotal, 1)
}

func IncrementMessageSendErrors() {
	atomic.AddInt64(&MessageSendErrorsTotal, 1)
}
