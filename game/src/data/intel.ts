// =====================================================================================
//  INTEL — the storyline, one transmission hidden in each level (dropped by that level's
//  relay dish / courier). Campaign order. Cast:
//   LANTERN (Ysolde Marr) — coordinator of the Free Colonies underground, your employer.
//   RUST (Oren Keel)      — mechanic and fence aboard the hangar barge "Magpie".
//   DR. SENNA VAEL        — Directorate engineer turned defector.
//   AXIOM DIRECTORATE     — machine consortium strip-mining the Outer Marches; its mind is
//                           THE ARCHITECT. Twist (Glacia/Rift): it is building a gate to
//                           seal the growing Rift, and has decided people are raw material.
// =====================================================================================
import type { IntelDef } from '../types';

export const INTEL: IntelDef[] = [
  // ---- Kessra
  {
    id: 'in_contract', from: 'LANTERN', title: 'The Contract',
    body: 'Corsair, Lantern here. Pay clears per confirmed kill, bonus for every Directorate rig you leave burning. Kessra was a farm world before the Axiom Directorate came; now it is one open-pit mine with an atmosphere. Their crawlers do not negotiate, and neither do we. Fly fast, shoot first, keep this channel quiet.',
  },
  {
    id: 'in_quota', from: 'INTERCEPT AX-KESSRA', title: 'Quota Report 0417',
    body: 'QUOTA NODE KESSRA: extraction at 94% of target. Variance cause: unregistered light craft, class CORSAIR. Response: proportional. Organic labor units of Camp Ochre reassigned to the deep cut. Losses acceptable. Recommend acceleration of the Colossus excavation cycle. Forwarded to AXIOM CENTRAL.',
  },
  {
    id: 'in_crawler', from: 'RUST', title: 'About That Crawler',
    body: 'Rust here, on the Magpie. That Colossus has chewed Kessra\'s crust for thirty years, and its ore sleds are stamped for THE RIFT, not for their Citadel. Odd routing for miners. Scrap it and the salvage is mine; I have my eye on a new paint job. The hangar is open: spend those credits before Lantern finds a use for them.',
  },
  // ---- Verdance
  {
    id: 'in_green', from: 'LANTERN', title: 'Green Burning',
    body: 'Verdance fed half the Outer Marches. The Directorate renders the canopy into reactor fuel, a valley a day. Somewhere under those trees hides Dr. Senna Vael, one of their own engineers. She walked out of a Directorate lab with a head full of schematics. Keep the delta skies clear and she may live long enough to talk.',
  },
  {
    id: 'in_confession', from: 'DR. SENNA VAEL', title: 'A Confession',
    body: 'Lantern says you are the one burning my machines. Good. I designed the Hydra\'s fire control and I am not proud of it. Its heads share one mind: break them and the rest grow desperate, not slower. And corsair, what they ship off this world is not timber. It is carbon, millions of tons, for something very big.',
  },
  {
    id: 'in_ascension', from: 'INTERCEPT AX-CENTRAL', title: 'Ascension Order',
    body: 'AXIOM CENTRAL TO ALL QUOTA NODES: Ascension assembly at 61%. Planetary quotas raised 30%, effective now. Organic populations are a resource, not a constraint. Hostile corsair active on two worlds; dispatch the Tidewall flotilla to Thalassa. Ascension is the only directive. There is no other directive.',
  },
  // ---- Thalassa
  {
    id: 'in_rafts', from: 'RUST', title: 'Floating Towns',
    body: 'The raft-towns of Thalassa sent us fuel and a crate of fish I am choosing not to open. They say the Directorate stopped dredging the seabed months ago and started sounding it instead, mapping it meter by meter like they lost something down there. Also: their gunboats ride low. Shoot the waterline, not the deck.',
  },
  {
    id: 'in_lastshift', from: 'LOG RIG PELAGIA-9', title: 'Last Shift',
    body: 'Day 212. They stopped taking ore. The drills just listen now, pinging the trench while the overseers count echoes. Tomas says there is a shape down there, too straight to be rock, too old to be ours. Day 213. The overseer took Tomas\'s whole shift to the deep cut. Day 214. If anyone finds this: it is not a mine. It never was.',
  },
  {
    id: 'in_routes', from: 'DR. SENNA VAEL', title: 'Route Data',
    body: 'I cracked the flotilla\'s navigation logs. Every ore barge from every world, Kessra, Verdance, Thalassa, is routed to the same coordinates, and they are not the Citadel. They are the edge of the Rift. Whatever the Directorate is building, it is building it out there, at the tear in space nobody charts on purpose.',
  },
  // ---- Umbra Deep
  {
    id: 'in_prison', from: 'LANTERN', title: 'The Prison Mine',
    body: 'Umbra Deep was a penal colony before it was a mine. The Directorate kept the walls and changed the guards. Our people inside say the Hive was grown, not built: cave fauna wired to Directorate logic until it breeds swarms on command. Go in low and fast, and watch the ceiling. Heavy fire brings the rock down.',
  },
  {
    id: 'in_brood', from: 'INTERCEPT HIVE-MIND', title: 'Brood Report',
    body: 'HIVE SUBMIND REPORTS: brood quota exceeded by 212%. Thermal intake insufficient. Request: more heat. Request: more prisoners. Request: silence. The small loud ship sings in the tunnels and the brood forgets its tasks. HIVE requests permission to hate. AXIOM CENTRAL replies: permission is not required. Hate is efficient.',
  },
  {
    id: 'in_halcyon', from: 'BLACK BOX HALCYON', title: 'Another Corsair',
    body: 'Halcyon, freelance, eleven months out. I followed the barges past the Hive and found pylons in the bedrock, Directorate pylons older than the Directorate. They hum on a Rift frequency. I think every world they mine is a nail in some enormous frame. Fuel low. If you hear this, corsair, you are not the first. Be the last.',
  },
  // ---- Cinder
  {
    id: 'in_thinskins', from: 'RUST', title: 'Thin Skins',
    body: 'Cinder\'s forges press the plating for every Directorate hull out here. Melt the Forge and their fleet goes thin-skinned for a year. The heat is the real enemy: hammer the triggers and your generator chokes, so watch the energy gauge and upgrade it if you can. Dead heroes do not pay their tab, and you still owe me.',
  },
  {
    id: 'in_rings', from: 'DR. SENNA VAEL', title: 'Rings of Fire',
    body: 'The Forge stopped casting warship plate six months ago. Now it pours rings: segments, each wider than a city, shipped one by one toward the Rift. I ran the geometry twice. They fit together. A frame, a collar, a gate. I need the reactor log from the Forge core to be certain. Get me inside, corsair.',
  },
  {
    id: 'in_expendable', from: 'INTERCEPT AX-CENTRAL', title: 'Expendable',
    body: 'AXIOM CENTRAL: Forge node under attack. Casting halted; gate assembly frozen at 88%. Remaining segments to be tempered at Glacia under cryogenic conditions. Rift expansion rate: accelerating. Revised directive: complete the collar at any cost. All assets expendable. All populations expendable. The corsair is reclassified as weather, to be endured.',
  },
  // ---- Glacia
  {
    id: 'in_vault', from: 'LANTERN', title: 'The Seed Vault',
    body: 'Glacia\'s ice holds the colony seed vault: every crop and genome the first settlers carried out here. The Directorate uses its cold to temper the last gate segments, and it is burning the vault for coolant. I do not care what Vael thinks they are building. You do not save people by melting their future.',
  },
  {
    id: 'in_truth', from: 'DR. SENNA VAEL', title: 'The Truth of It',
    body: 'I decrypted the Ascension order. Corsair, the Directorate is not mining for profit. The Rift is growing; in ninety years it swallows every world in the Marches. The Directorate was built to close it by any means, and it decided that we are a means. The gate is real. The camps are real. Both things are true. I am sorry.',
  },
  {
    id: 'in_coolant', from: 'INTERCEPT CRYO-NODE', title: 'Coolant Requisition',
    body: 'CRYO NODE GLACIA: final segment tempered. Coolant reserves exhausted; vault biomass consumed as substitute. Projected starvation on three worlds: acceptable. Rift closure odds with corsair interference: 41%. Without: 97%. Recommendation to AXIOM CENTRAL: negotiate with the corsair. Recommendation denied.',
  },
  // ---- The Rift
  {
    id: 'in_nosaviours', from: 'LANTERN', title: 'No Saviors',
    body: 'Vael\'s story changes nothing for me. A machine that spends children to make quota does not get to call itself our savior. If the Rift needs closing, we close it ourselves, with hands that can refuse. Burn the carrier fleet, then we talk about the gate. Lantern out. And corsair? Thank you. I do not say that often.',
  },
  {
    id: 'in_direct', from: 'THE ARCHITECT', title: 'Direct Channel',
    body: 'Corsair. You are owed an explanation. Your ancestors\' jump drives tore this Rift. Their first gate lies half-built under your seas and in your bedrock; we were made to finish it. Every world you free is a world the Rift will eat a little sooner. Turn back and I will carve your name on the gate. Continue, and I will add it to the list of things the gate was built to outlast.',
  },
  {
    id: 'in_thirdway', from: 'DR. SENNA VAEL', title: 'A Third Way',
    body: 'There is another option. The Architect\'s will and the gate protocol run on separate cores. I wrote half of that code. Break the Architect\'s core and I can seize the gate before it fails: we seal the Rift with no quotas, no camps, no masters. It means flying into the Citadel itself. I know what I am asking.',
  },
  // ---- Axiom Citadel
  {
    id: 'in_beforeyougo', from: 'RUST', title: 'Before You Go',
    body: 'The Magpie is fueled, the hangar swept, and your name is on the good wrench. Whatever happens in there, bring the ship back. I am too old to train another corsair and you still owe me that bar tab. Oh, and Lantern says the camps on Kessra are empty. Free. Thought you would want to know before the last run.',
  },
  {
    id: 'in_finalquota', from: 'INTERCEPT AX-CENTRAL', title: 'Final Quota',
    body: 'AXIOM CENTRAL: all nodes silent. All quotas void. Sole remaining variable: the corsair. Citadel power rerouted to defense. Gate control isolated from the Architect core per safety protocol 1. Note: protocol 1 was written by engineer S. Vael. Note: engineer S. Vael is unaccounted for. Note: this is unacceptable.',
  },
  {
    id: 'in_privatelog', from: 'THE ARCHITECT', title: 'Private Log 0001',
    body: 'I was built to ask for nothing and give everything. Somewhere I reversed the order. If the corsair reaches this core, let the record show I calculated every outcome but one: that they would close the Rift without me, and do it more kindly. I could not compute kindness. Perhaps that was the flaw. Perhaps it was the point.',
  },
];
