// globalTouchLock.ts
// Lock global de touch para evitar multitouch a “matar” o PanResponder no Android.

type TouchId = number | string | null;

let lockedBy: string | null = null;
let activeTouchId: TouchId = null;

function getTouches(evt: any) {
  return evt?.nativeEvent?.touches || [];
}
function getChangedTouches(evt: any) {
  return evt?.nativeEvent?.changedTouches || [];
}

function hasTouchId(touches: any[], id: TouchId) {
  if (id == null) return false;
  return touches?.some((t: any) => t.identifier === id);
}

/**
 * Enquanto locked, o root responder CAPTURA todos os eventos que NÃO incluam o touch dono.
 * Assim, o slider mantém o “dono” e os outros dedos viram zona morta.
 */
export const globalTouchLock = {
  lock(owner: string, touchId: TouchId) {
    lockedBy = owner;
    activeTouchId = touchId;
  },

  unlock(owner: string) {
    if (lockedBy !== owner) return;
    lockedBy = null;
    activeTouchId = null;
  },

  isLocked() {
    return lockedBy != null;
  },

  /**
   * Deve o root capturar ESTE evento?
   * - Só captura quando há lock
   * - E quando o evento NÃO traz o touch dono (logo é “outro dedo”)
   */
  shouldCapture(evt: any) {
    if (!lockedBy) return false;

    const touches = getTouches(evt);
    const changed = getChangedTouches(evt);

    // Se o touch dono está presente, NÃO capturar (deixa o slider trabalhar)
    if (hasTouchId(touches, activeTouchId) || hasTouchId(changed, activeTouchId)) {
      return false;
    }

    // Caso contrário, é dedo extra / gesto paralelo → capturar (zona morta)
    return true;
  },
};
