import { generateRoute } from "../packages/core/routePlannerX402"
import { generatePoRD } from "../packages/core/podGeneratorX402"
import { MixStateMachine } from "../packages/core/mixStateMachine"

export function runSimulatedDeal(input: any) {
  const deal = { ...input, id: "dl_" + Date.now(), state: "DEAL_CREATED", log: [] }
  const machine = new MixStateMachine(deal)
  machine.runAll()
  const route = generateRoute(deal.hops)
  const proof = generatePoRD(deal, route)
  return { ...deal, receipt: proof }
}
