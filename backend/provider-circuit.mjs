export const CIRCUIT_MESSAGE='Automatic filling is temporarily unavailable, your packet is ready for assisted apply';
// Persisted health is serialized by a database row lock, across worker instances.
export function circuitOutcome(health,status,manual=false){
 const qualifying=status===402||(status>=500&&status<=599);
 const count=qualifying?(health.consecutive_failures||0)+1:0;
 const recovered=manual&&status>=200&&status<300;
 return {consecutive_failures:count,circuit_open:recovered?false:!!health.circuit_open||count>=3};
}
