package com.tanks.server.websocket.dto.gameplay;

public final class OnlinePlayerIntentRequestPayloads {

        private OnlinePlayerIntentRequestPayloads() {
        }

        public record Move(int direction) {
        }

        public record Aim(double angle, double power) {
        }

        public record SelectProjectileSlot(String projectileSlotId) {
        }

        public record Fire(double angle, double power, String projectileSlotId) {
        }
}
