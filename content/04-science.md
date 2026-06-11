# The Science Behind the Brew

*A deeper look at what instrumented testing revealed about the Moka pot.*

---

## Why This Is Harder Than It Looks

The Moka pot is used daily by hundreds of millions of people. It seems simple: put coffee in, put water in, put it on the heat, coffee comes out.

But when you attach temperature probes, a pressure transducer, and a flow meter to one — as researchers have done — you discover that a tiny change in any variable produces significant, measurable differences in temperature, pressure, yield, and taste. It is an *extremely* sensitive brewing device masquerading as a casual kitchen object.

---

## Starting Water Temperature: What the Data Shows

Five experiments were run starting with water at 20°C, 40°C, 60°C, 80°C, and freshly boiled (≈100°C).

Key findings:

- **Cold start (20–40°C):** First water through the coffee ≈ 60°C. Then temperature climbs rapidly to ≈120°C by the end of the brew. The early extraction is severely under-extracted; the late extraction is severely over-extracted.
- **Freshly boiled start:** First water through the coffee ≈ 88–92°C. Temperature range is much narrower throughout the brew.

The conclusion is clear: **always start with freshly boiled water.** It collapses the temperature range and gives you a sensible brew temperature from the very first drop.

---

## Grind Size: The Unexpected Discovery

Intuition suggests that grinding finer should eventually cause channelling (water finding the path of least resistance rather than extracting evenly), dropping extraction. Tests showed this *didn't* happen.

Instead, finer grinding:
1. **Increased extraction** consistently — up to a point
2. **Raised brew temperature** — because finer coffee creates more resistance, which builds more pressure, which raises the boiling point of the water further

The hottest brews were the most highly extracted, but also the least pleasant to drink — harsh, bitter, with the characteristic Moka "edge."

The practical takeaway: grind fine for extraction benefit, but not so fine that you're building excessive pressure and temperature. The sweet spot sits between "filter fine" and "espresso fine."

---

## Heat Power: High vs Medium vs Low

Three settings were tested: high, medium, and low flame.

- **High and medium** produced similar peak pressures and temperatures but reached them at different speeds. Interestingly, **high performed slightly better than medium** in terms of yield before sputtering — possibly because a fast heat-up followed by a natural cool-down was more controlled than a drawn-out medium heat.
- **Low heat** produced the best results overall: the lowest peak brew temperature, the least bitterness, the most forgiving window to stop the brew.

**Recommendation: always use the lowest flame that will sustain the brew.** If the brew stalls, briefly boost the heat then return to low.

---

## The Diffusion Plate: An Accidental Discovery

Testing was done with a cast iron diffusion plate between the gas flame and the pot. What was intended as a safety/stability measure turned out to be a significant brewing aid.

The plate acts as a **thermal battery**:
- It stores heat as it warms up
- When you cut the gas, the plate continues discharging heat into the pot gradually
- This allows the brew to continue with enough energy to push remaining water through the coffee, without the temperature spiking

Without the plate, cutting the gas drops pressure quickly and the brew stalls. With the plate, cutting the gas at the moment liquid first appears produces a gentle, sustained finish.

For gas hob users, a diffusion plate is one of the most impactful upgrades you can make to your Moka routine.

---

## Yield: The Most Important Variable

Analysis of cumulative extraction data confirmed something important: **the amount of liquid you push through the coffee is one of the most significant variables in the final cup.**

Target: get at least **60% of the water from the boiler** through the coffee before sputtering begins.

For a 4-cup pot with ≈200–230ml in the boiler, that means ≈130–150ml in the top chamber.

- **Below this:** under-extracted, sour, thin
- **Above this (to a point):** increasingly well-extracted, sweet, balanced
- **Beyond the sputter:** over-extracted, bitter, harsh

Measuring your yield (with a kitchen scale) is the single most useful diagnostic tool you have.

---

## The Aeropress Paper Filter: Does It Help?

Testing one Aeropress paper filter placed in the top chamber (between the basket and the collector) showed:

- A small but real increase in extraction
- Slightly higher brew temperatures (the paper adds a touch of resistance)
- Notably cleaner, sweeter, more complex flavour in the cup
- Slightly foamier pour (dissipates quickly)

The increase in extraction and temperature was small. The flavour improvement was clear. For the minimal cost and effort, it is worth doing.

**Don't use two filters or thicker filters** — the extra resistance has a meaningful effect on temperature and may require compensating with a coarser grind, which partially offsets the benefit.

---

## Aluminium vs Stainless: Thermal Imaging Evidence

Using a thermal imaging camera (with heat-proof paint patches to overcome reflectivity problems), the two materials were compared heating from cold.

Observations:
- Stainless steel developed an isolated hot spot at the base of the upper chamber relatively quickly
- Aluminium distributed heat more evenly, but the lower chamber ran significantly hotter overall
- When brewing began, the liquid in the aluminium pot appeared hotter than in the stainless pot

**Interpretation:** Stainless steel may provide a degree of thermal insulation that moderates the heat reaching the water. The difference isn't enormous, but it suggests stainless pots are slightly more forgiving.

---

## Could You Brew Below 100°C?

One experiment tried: what if you kept the whole brew below boiling point?

Result: yes, technically possible. Peak pressure was just 0.12 bar. Brew temperatures stayed in the mid-90s. The brew never exceeded 100°C.

However: the brew took **10 minutes**, produced a lower extraction than expected, and didn't taste particularly good. Not recommended. But it proved the system works even at very low pressures.

---

## Summary of Key Numbers

| Variable | Recommended |
|---|---|
| Starting water temp | Freshly boiled (≈100°C) |
| Boiler fill | To base of safety valve (light roast) or 2/3–3/4 (dark roast) |
| Pressure when liquid first flows | ≈0.3 bar |
| Peak pressure (controlled brew) | ≈0.5–0.6 bar |
| Brew temperature range (good) | ≈88–105°C |
| Target yield (4-cup) | 130–150ml |
| Yield as % of boiler water | ≥60% |
| Extraction percentage (well-brewed) | ≈22–23.5% |
