const countryProfiles = {
	Sudan: {
		bbox: [21, 8, 39, 22],
		center: [30.2, 14.9],
		tone: 216,
		summary: "Field reports show civilian displacement and infrastructure collapse concentrated across transit corridors."
	},
	Ukraine: {
		bbox: [22, 44, 41, 53],
		center: [31, 48.8],
		tone: 264,
		summary: "Mixed media packets indicate repeated strikes near energy and transport nodes with secondary digital blackout signals."
	},
	Myanmar: {
		bbox: [92, 10, 101, 28],
		center: [96.5, 19.7],
		tone: 242,
		summary: "Incoming audio notes highlight road access restrictions and fragmented communication routes in contested regions."
	},
	Haiti: {
		bbox: [-74, 17, -71, 20],
		center: [-72.3, 18.9],
		tone: 296,
		summary: "Image and voice bundles point to supply bottlenecks and sudden humanitarian demand spikes around urban hubs."
	},
	Yemen: {
		bbox: [42, 12, 54, 19],
		center: [47.5, 15.8],
		tone: 232,
		summary: "Packets show recurring disruptions in water and medical access, with repeated evidence of localized movement barriers."
	},
	Gaza: {
		bbox: [34, 31, 35.6, 33.2],
		center: [34.7, 32.1],
		tone: 284,
		summary: "High-velocity submissions indicate dense incident clustering and urgent requests for verified situational visibility."
	}
};

const primarySeed = [
	{ country: "Sudan", coords: [32.5, 15.5], kind: "image", note: "Photo packet routed through SMS corridor gateway." },
	{ country: "Sudan", coords: [30.8, 13.8], kind: "audio", note: "Voice report transcribed with local dialect model." },
	{ country: "Ukraine", coords: [30.5, 50.4], kind: "video", note: "Night footage aligned to grid outage timeline." },
	{ country: "Ukraine", coords: [35.1, 48.5], kind: "image", note: "Civilian shelter conditions captured from field handset." },
	{ country: "Myanmar", coords: [96.1, 21.9], kind: "audio", note: "Displacement route guidance captured from eyewitness call." },
	{ country: "Myanmar", coords: [94.8, 16.7], kind: "document", note: "Local aid checkpoint roster submitted as photo scan." },
	{ country: "Haiti", coords: [-72.3, 18.5], kind: "image", note: "Flood damage stills sent via low-bandwidth fallback lane." },
	{ country: "Yemen", coords: [44.3, 15.4], kind: "audio", note: "Primary voice note flagged for medical urgency keywords." },
	{ country: "Gaza", coords: [34.5, 31.6], kind: "video", note: "Street-level clip queued for object and smoke detection." },
	{ country: "Gaza", coords: [34.8, 32.0], kind: "image", note: "Image packet matched to prior geolocated debris pattern." }
];

const osintSeed = [
	{ country: "Sudan", coords: [31.9, 15.7], kind: "social-post", note: "Public post cluster indicates corroborating movement spike." },
	{ country: "Ukraine", coords: [34.2, 49.7], kind: "social-video", note: "Open clip mirrors local power disruption narrative." },
	{ country: "Myanmar", coords: [97.7, 20.0], kind: "forum-thread", note: "Secondary channel discussion references blocked roads." },
	{ country: "Haiti", coords: [-72.8, 18.2], kind: "social-image", note: "Public image stream supports infrastructure damage claim." },
	{ country: "Yemen", coords: [47.0, 15.2], kind: "news-snippet", note: "Regional reporting feed echoes medicine shortage trend." },
	{ country: "Gaza", coords: [34.9, 31.8], kind: "social-video", note: "Platform repost pattern tracks the same event window." }
];

const dom = {
	feedCountry: document.getElementById("feedCountry"),
	feedSummary: document.getElementById("feedSummary"),
	cinemaStrip: document.getElementById("cinemaStrip"),
	frameStamp: document.getElementById("frameStamp"),
	primaryCount: document.getElementById("primaryCount"),
	osintCount: document.getElementById("osintCount"),
	trustIndex: document.getElementById("trustIndex"),
	primaryCardVisual: document.getElementById("primaryCardVisual"),
	osintCardVisual: document.getElementById("osintCardVisual"),
	trustCardVisual: document.getElementById("trustCardVisual"),
	sideColumn: document.getElementById("sideColumn"),
	panelTongue: document.getElementById("panelTongue"),
	autoFocusToggle: document.getElementById("autoFocusToggle"),
	sourceBalancePrimary: document.getElementById("sourceBalancePrimary"),
	sourceBalanceOsint: document.getElementById("sourceBalanceOsint"),
	sourceBalanceLabel: document.getElementById("sourceBalanceLabel"),
	pipelineLog: document.getElementById("pipelineLog"),
	statusLine: document.getElementById("statusLine")
};

let map = null;
if (typeof window.maplibregl !== "undefined") {
	map = new window.maplibregl.Map({
		container: "map",
		center: [14.5, 18],
		zoom: 1.6,
		minZoom: 1.2,
		maxZoom: 8,
		pitch: 12,
		attributionControl: false,
		style: {
			version: 8,
			glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
			sources: {},
			layers: [
				{
					id: "base-black",
					type: "background",
					paint: {
						"background-color": "#111519"
					}
				}
			]
		}
	});

	map.addControl(new window.maplibregl.NavigationControl({ visualizePitch: true }), "bottom-left");
}

let primaryFeatures = [];
let osintFeatures = [];
let featureIdCounter = 1;
let hoveredCountryFeatureId = null;
let activeCountry = null;
let basemapFallbackStage = 0;
let hoverHandlersWired = false;
let packetStreamStarted = false;
let pendingPacketFocus = null;
let autoFocusEnabled = true;

function setStatus(message) {
	dom.statusLine.textContent = message;
}

if (!map) {
	setStatus("Map engine unavailable. Reload to retry CDN assets.");
	const mapNode = document.getElementById("map");
	if (mapNode) {
		mapNode.style.background = "radial-gradient(circle at 50% 45%, rgba(32, 32, 32, 0.7), rgba(0, 0, 0, 1))";
	}
}

updateMetricCardVisuals("Global Desk");
syncPanelDrawerState(false);
initPanelDrawer();
initAutoFocusToggle();

function setFocusedCountry(countryName, options = {}) {
	if (!countryProfiles[countryName]) {
		return;
	}

	const shouldMoveMap = Boolean(options.shouldMoveMap) && autoFocusEnabled;
	activeCountry = countryName;
	refreshCountryHeatmap(countryName);
	updateCountryFeed(countryName);

	if (shouldMoveMap && map) {
		const profile = countryProfiles[countryName];
		const zoomFloor = options.zoomFloor ?? 3.2;
		map.easeTo({ center: profile.center, duration: options.duration ?? 850, zoom: Math.max(map.getZoom(), zoomFloor) });
	}
}

function initAutoFocusToggle() {
	if (!dom.autoFocusToggle) {
		return;
	}

	autoFocusEnabled = dom.autoFocusToggle.checked;

	dom.autoFocusToggle.addEventListener("change", (event) => {
		autoFocusEnabled = event.target.checked;

		if (!autoFocusEnabled) {
			if (pendingPacketFocus) {
				window.clearTimeout(pendingPacketFocus);
				pendingPacketFocus = null;
			}

			if (map) {
				map.stop();
			}

			setStatus("Auto focus paused. Map and desk country are locked.");
			return;
		}

		setStatus("Auto focus enabled. Map and desk will follow focus changes.");

		if (activeCountry) {
			setFocusedCountry(activeCountry);
		}
	});
}

function safeSetPaint(layerId, property, value) {
	if (!map || !map.getLayer(layerId)) {
		return;
	}

	map.setPaintProperty(layerId, property, value);
}

function syncPanelDrawerState(expanded) {
	if (!dom.sideColumn || !dom.panelTongue) {
		return;
	}

	dom.sideColumn.classList.toggle("is-collapsed", !expanded);
	dom.panelTongue.setAttribute("aria-expanded", expanded ? "true" : "false");
	dom.panelTongue.setAttribute("aria-label", expanded ? "Collapse desk panel" : "Expand desk panel");
	dom.panelTongue.querySelector(".panel-tongue-arrow").textContent = expanded ? "v" : "^";
}

function initPanelDrawer() {
	if (!dom.sideColumn || !dom.panelTongue) {
		return;
	}

	let expanded = false;
	syncPanelDrawerState(expanded);

	dom.panelTongue.addEventListener("click", () => {
		expanded = !expanded;
		syncPanelDrawerState(expanded);
	});

	window.addEventListener("keydown", (event) => {
		if (event.key === "Escape" && expanded) {
			expanded = false;
			syncPanelDrawerState(expanded);
		}
	});
}

function focusOnIncomingFeature(feature) {
	if (!map || !feature || !feature.geometry || feature.geometry.type !== "Point" || !autoFocusEnabled) {
		return;
	}

	const coordinates = feature.geometry.coordinates;
	const targetZoom = feature.properties.sourceType === "primary" ? 5.3 : 4.8;
	const countryName = feature.properties.country;

	if (countryProfiles[countryName]) {
		setFocusedCountry(countryName);
	}

	if (pendingPacketFocus) {
		window.clearTimeout(pendingPacketFocus);
	}

	pendingPacketFocus = window.setTimeout(() => {
		if (!map) {
			return;
		}

		map.stop();
		map.easeTo({
			center: coordinates,
			zoom: Math.max(map.getZoom(), targetZoom),
			duration: 1650,
			essential: true
		});

		pendingPacketFocus = null;
	}, 180);
}

function startPacketStream() {
	if (packetStreamStarted) {
		return;
	}

	window.setInterval(() => {
		ingestPacket("primary");
	}, 2450);

	window.setInterval(() => {
		ingestPacket("osint");
	}, 3950);

	packetStreamStarted = true;
}

function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}

function formatShortTime(timestamp) {
	const date = new Date(timestamp);
	return date.toISOString().slice(11, 19) + " UTC";
}

function updateSourceBalance(primaryCount, osintCount) {
	const total = primaryCount + osintCount;
	const primaryRatio = total > 0 ? primaryCount / total : 0.5;
	const osintRatio = total > 0 ? osintCount / total : 0.5;

	if (dom.sourceBalancePrimary) {
		dom.sourceBalancePrimary.style.width = `${Math.round(primaryRatio * 100)}%`;
	}

	if (dom.sourceBalanceOsint) {
		dom.sourceBalanceOsint.style.width = `${Math.round(osintRatio * 100)}%`;
	}

	if (dom.sourceBalanceLabel) {
		dom.sourceBalanceLabel.textContent = `${Math.round(primaryRatio * 100)}% primary direct vs ${Math.round(osintRatio * 100)}% secondary OSINT`;
	}
}

function updateTrustIndex(primaryCount, osintCount) {
	const total = primaryCount + osintCount;
	const primaryRatio = total > 0 ? primaryCount / total : 0.5;
	const confidence = clamp(62 + primaryRatio * 34 - osintCount * 0.45 + primaryCount * 0.18, 48, 98);

	if (dom.trustIndex) {
		dom.trustIndex.textContent = `${Math.round(confidence)}%`;
	}
}

function buildCountryGeoJSON() {
	const features = Object.entries(countryProfiles).map(([name, profile], index) => {
		const [west, south, east, north] = profile.bbox;
		return {
			type: "Feature",
			id: index + 1,
			properties: { name },
			geometry: {
				type: "Polygon",
				coordinates: [
					[
						[west, south],
						[east, south],
						[east, north],
						[west, north],
						[west, south]
					]
				]
			}
		};
	});

	return {
		type: "FeatureCollection",
		features
	};
}

function stableNoise(seed) {
	const value = Math.sin(seed) * 10000;
	return value - Math.floor(value);
}

function buildCountryHeatGeoJSON(focusCountry = null) {
	const features = [];

	Object.entries(countryProfiles).forEach(([name, profile]) => {
		const [west, south, east, north] = profile.bbox;
		const centerLng = profile.center[0];
		const centerLat = profile.center[1];
		const spanLng = Math.max((east - west) * 0.62, 0.8);
		const spanLat = Math.max((north - south) * 0.62, 0.8);
		const focused = name === focusCountry;
		const baseSeed = [...name].reduce((acc, char, idx) => acc + char.charCodeAt(0) * (idx + 1), 0);
		const pointCount = 28;

		for (let i = 0; i < pointCount; i += 1) {
			const seedA = baseSeed + i * 13.91;
			const seedB = baseSeed * 1.17 + i * 97.13;
			const seedC = baseSeed * 0.83 + i * 7.77;

			const angle = stableNoise(seedA) * Math.PI * 2;
			const radial = Math.pow(stableNoise(seedB), 1.7);
			const jitter = (stableNoise(seedC) - 0.5) * 0.24;

			const lng = centerLng + Math.cos(angle) * spanLng * radial;
			const lat = centerLat + Math.sin(angle) * spanLat * radial;
			const baseIntensity = (1.1 - radial * 0.95) + jitter;
			const intensity = Math.max(0.16, baseIntensity) * (focused ? 2.45 : 0.42);

			features.push({
				type: "Feature",
				properties: {
					country: name,
					intensity
				},
				geometry: {
					type: "Point",
					coordinates: [lng, lat]
				}
			});
		}

		features.push({
			type: "Feature",
			properties: {
				country: name,
				intensity: focused ? 3.4 : 0.52
			},
			geometry: {
				type: "Point",
				coordinates: [centerLng, centerLat]
			}
		});
	});

	return {
		type: "FeatureCollection",
		features
	};
}

function toFeatureCollection(features) {
	return {
		type: "FeatureCollection",
		features
	};
}

function jitter([lng, lat], amount = 0.52) {
	const lngOffset = (Math.random() - 0.5) * amount;
	const latOffset = (Math.random() - 0.5) * amount;
	return [lng + lngOffset, lat + latOffset];
}

function createPacketFeature(packet, sourceType) {
	const kindWeights = {
		video: 1,
		image: 0.84,
		audio: 0.77,
		document: 0.64,
		"social-post": 0.56,
		"social-video": 0.72,
		"social-image": 0.62,
		"forum-thread": 0.52,
		"news-snippet": 0.5
	};

	const baseWeight = kindWeights[packet.kind] ?? 0.66;
	const strength = sourceType === "primary"
		? clamp(baseWeight + 0.08, 0.45, 1.12)
		: clamp(baseWeight - 0.05, 0.35, 0.95);

	return {
		type: "Feature",
		id: featureIdCounter,
		geometry: {
			type: "Point",
			coordinates: jitter(packet.coords)
		},
		properties: {
			id: featureIdCounter++,
			country: packet.country,
			kind: packet.kind,
			note: packet.note,
			strength,
			sourceType,
			timestamp: Date.now()
		}
	};
}

function escapeSVGText(value) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&apos;");
}

const frameSceneProfiles = {
	Sudan: {
		skyTop: "#b8825a",
		skyBottom: "#3a2a24",
		terrainA: "#6a503f",
		terrainB: "#2c221d",
		accent: "#dfc29a",
		structure: "dunes"
	},
	Ukraine: {
		skyTop: "#8ea8bc",
		skyBottom: "#445565",
		terrainA: "#657059",
		terrainB: "#273027",
		accent: "#d6debe",
		structure: "blocks"
	},
	Myanmar: {
		skyTop: "#7e9b7b",
		skyBottom: "#2f3f2e",
		terrainA: "#4d5f3e",
		terrainB: "#1b2318",
		accent: "#d4d3a9",
		structure: "forest"
	},
	Haiti: {
		skyTop: "#80a8b5",
		skyBottom: "#2b4852",
		terrainA: "#54735f",
		terrainB: "#202b24",
		accent: "#d7e3c8",
		structure: "coast"
	},
	Yemen: {
		skyTop: "#9f7b63",
		skyBottom: "#473229",
		terrainA: "#715844",
		terrainB: "#241d18",
		accent: "#e1c1a1",
		structure: "cliffs"
	},
	Gaza: {
		skyTop: "#8b9aac",
		skyBottom: "#394551",
		terrainA: "#66615c",
		terrainB: "#252221",
		accent: "#ddd4ca",
		structure: "dense"
	}
};

function buildFrameImage(countryName, label, frameIndex) {
	const scene = frameSceneProfiles[countryName] ?? frameSceneProfiles.Sudan;
	const escapedCountry = escapeSVGText(countryName.toUpperCase());
	const escapedLabel = escapeSVGText(label.toUpperCase());
	const horizonShift = 190 + frameIndex * 12;
	const structureOpacity = 0.14 + frameIndex * 0.04;

	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
		<defs>
			<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stop-color="${scene.skyTop}" />
				<stop offset="100%" stop-color="${scene.skyBottom}" />
			</linearGradient>
			<linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stop-color="${scene.terrainA}" />
				<stop offset="100%" stop-color="${scene.terrainB}" />
			</linearGradient>
			<linearGradient id="vignette" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0%" stop-color="rgba(255,255,255,0.06)" />
				<stop offset="100%" stop-color="rgba(0,0,0,0.42)" />
			</linearGradient>
			<pattern id="scan" width="6" height="6" patternUnits="userSpaceOnUse">
				<rect width="6" height="1" fill="rgba(255,255,255,0.04)" />
			</pattern>
		</defs>
		<rect width="640" height="360" fill="url(#sky)" />
		<circle cx="${540 - frameIndex * 40}" cy="${76 + frameIndex * 8}" r="86" fill="rgba(255,255,255,0.08)" />
		<path d="M0 ${horizonShift} C88 ${horizonShift - 34}, 150 ${horizonShift - 78}, 236 ${horizonShift - 26} C314 ${horizonShift + 20}, 414 ${horizonShift - 88}, 640 ${horizonShift - 18} L640 360 L0 360 Z" fill="url(#ground)" />
		<path d="M0 ${horizonShift + 26} C100 ${horizonShift - 10}, 174 ${horizonShift + 10}, 274 ${horizonShift - 28} C358 ${horizonShift - 60}, 468 ${horizonShift + 16}, 640 ${horizonShift - 36}" fill="none" stroke="rgba(255,255,255,${structureOpacity})" stroke-width="3" />
		<g fill="rgba(255,255,255,${structureOpacity})" stroke="none">
			<rect x="64" y="${horizonShift - 18}" width="18" height="42" />
			<rect x="90" y="${horizonShift - 34}" width="22" height="58" />
			<rect x="124" y="${horizonShift - 10}" width="14" height="34" />
			<rect x="478" y="${horizonShift - 22}" width="20" height="46" />
			<rect x="504" y="${horizonShift - 42}" width="26" height="66" />
			<rect x="538" y="${horizonShift - 14}" width="16" height="38" />
		</g>
		<path d="M0 0 H640 V360 H0 Z" fill="url(#vignette)" />
		<rect width="640" height="360" fill="url(#scan)" />
		<rect x="18" y="18" width="604" height="324" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="1.5" />
		<rect x="26" y="24" width="154" height="28" fill="rgba(0,0,0,0.34)" />
		<text x="34" y="44" fill="rgba(255,255,255,0.96)" font-size="16" font-family="Helvetica, Arial, sans-serif">FIELD IMAGE ${frameIndex + 1}</text>
		<text x="34" y="76" fill="rgba(255,255,255,0.94)" font-size="42" font-family="Barlow Condensed, Helvetica, Arial, sans-serif" letter-spacing="2">${escapedCountry}</text>
		<rect x="34" y="270" width="12" height="12" rx="6" fill="#38dc79" />
		<text x="56" y="281" fill="white" font-size="17" font-family="Helvetica, Arial, sans-serif" font-weight="700">${escapedLabel}</text>
		<text x="34" y="326" fill="${scene.accent}" font-size="15" font-family="Helvetica, Arial, sans-serif">PROJECT800 VISUAL TRACE ${frameIndex + 1}</text>
	</svg>`;

	return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function buildMetricCardImage(countryName, label, tint) {
	const escapedCountry = escapeSVGText(countryName.toUpperCase());
	const escapedLabel = escapeSVGText(label.toUpperCase());

	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="264" viewBox="0 0 480 264">
		<defs>
			<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0%" stop-color="${tint}" />
				<stop offset="100%" stop-color="#090a0b" />
			</linearGradient>
			<pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse">
				<path d="M 28 0 L 0 0 0 28" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
			</pattern>
		</defs>
		<rect width="480" height="264" fill="url(#bg)" />
		<rect width="480" height="264" fill="url(#grid)" />
		<path d="M0 210 C90 178 126 222 214 174 C280 138 330 166 480 96 L480 264 L0 264 Z" fill="rgba(255,255,255,0.12)" />
		<path d="M0 188 C80 132 140 204 222 154 C296 110 330 140 480 60" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="2.5" />
		<rect x="18" y="18" width="444" height="228" fill="none" stroke="rgba(255,255,255,0.24)" stroke-width="1.5" />
		<text x="28" y="54" fill="rgba(255,255,255,0.96)" font-size="34" font-family="Barlow Condensed, Helvetica, Arial, sans-serif" font-weight="700">${escapedCountry}</text>
		<text x="28" y="90" fill="rgba(255,255,255,0.74)" font-size="16" font-family="Helvetica, Arial, sans-serif">${escapedLabel}</text>
		<circle cx="418" cy="58" r="14" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.42)" stroke-width="1.5" />
		<circle cx="418" cy="58" r="4" fill="rgba(255,255,255,0.94)" />
	</svg>`;

	return `url("data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}")`;
}

function updateMetricCardVisuals(countryName) {
	const primaryImage = buildMetricCardImage(countryName, "Primary Direct", "#1a5131");
	const osintImage = buildMetricCardImage(countryName, "Secondary OSINT", "#5d3114");
	const trustImage = buildMetricCardImage(countryName, "Trust Index", "#3a3f44");

	if (dom.primaryCardVisual) {
		dom.primaryCardVisual.style.setProperty("--metric-image", primaryImage);
	}

	if (dom.osintCardVisual) {
		dom.osintCardVisual.style.setProperty("--metric-image", osintImage);
	}

	if (dom.trustCardVisual) {
		dom.trustCardVisual.style.setProperty("--metric-image", trustImage);
	}
}

function renderCinema(countryName) {
	const labels = ["Image Packet", "Audio Waveform", "Metadata Trace"];
	dom.cinemaStrip.innerHTML = "";

	if (dom.frameStamp) {
		dom.frameStamp.textContent = `Updated ${formatShortTime(Date.now())}`;
	}

	labels.forEach((label, index) => {
		const figure = document.createElement("figure");
		figure.className = "frame-card";
		figure.style.animationDelay = `${index * 130}ms`;

		const image = document.createElement("img");
		image.src = buildFrameImage(countryName, label, index);
		image.alt = `${countryName} ${label}`;

		const caption = document.createElement("figcaption");
		caption.textContent = `${label} routed through anti-censorship ingress lane`;

		figure.append(image, caption);
		dom.cinemaStrip.appendChild(figure);
	});
}

function updateCountryFeed(countryName) {
	const profile = countryProfiles[countryName];
	if (!profile) {
		return;
	}

	dom.feedCountry.textContent = countryName;
	dom.feedSummary.textContent = profile.summary;

	const primaryInCountry = primaryFeatures.filter((item) => item.properties.country === countryName).length;
	const osintInCountry = osintFeatures.filter((item) => item.properties.country === countryName).length;

	dom.primaryCount.textContent = String(primaryInCountry);
	dom.osintCount.textContent = String(osintInCountry);
	updateSourceBalance(primaryInCountry, osintInCountry);
	updateTrustIndex(primaryInCountry, osintInCountry);
	updateMetricCardVisuals(countryName);

	renderCinema(countryName);
}

function addPipelineLogEntry(feature) {
	const entry = document.createElement("li");
	entry.className = feature.properties.sourceType === "primary" ? "primary-log" : "osint-log";

	const sourceLabel = feature.properties.sourceType === "primary" ? "PRIMARY" : "OSINT";
	const kind = feature.properties.kind.toUpperCase();
	const timeMark = formatShortTime(feature.properties.timestamp);
	entry.innerHTML = `<span class="log-meta"><strong>${sourceLabel}</strong><span class="log-divider">|</span><span class="log-time">${timeMark}</span><span class="log-divider">|</span><span class="log-kind">${kind}</span></span>from ${feature.properties.country}: ${feature.properties.note}`;

	dom.pipelineLog.prepend(entry);

	while (dom.pipelineLog.children.length > 8) {
		dom.pipelineLog.lastElementChild.remove();
	}
}

function refreshCountsForActiveCountry() {
	if (!activeCountry) {
		dom.primaryCount.textContent = String(primaryFeatures.length);
		dom.osintCount.textContent = String(osintFeatures.length);
		updateSourceBalance(primaryFeatures.length, osintFeatures.length);
		updateTrustIndex(primaryFeatures.length, osintFeatures.length);
		updateMetricCardVisuals("Global Desk");
		return;
	}

	updateCountryFeed(activeCountry);
}

function refreshMapSources() {
	if (!map) {
		refreshCountsForActiveCountry();
		return;
	}

	const primarySource = map.getSource("primary-reports");
	const osintSource = map.getSource("osint-reports");

	if (primarySource) {
		primarySource.setData(toFeatureCollection(primaryFeatures));
	}

	if (osintSource) {
		osintSource.setData(toFeatureCollection(osintFeatures));
	}

	refreshCountsForActiveCountry();
}

function refreshCountryHeatmap(focusCountry = null) {
	if (!map) {
		return;
	}

	const source = map.getSource("country-heat");
	if (!source) {
		return;
	}

	source.setData(buildCountryHeatGeoJSON(focusCountry));
}

function ingestPacket(sourceType) {
	const pool = sourceType === "primary" ? primarySeed : osintSeed;
	const packet = pool[Math.floor(Math.random() * pool.length)];
	const feature = createPacketFeature(packet, sourceType);

	if (sourceType === "primary") {
		primaryFeatures.push(feature);
		primaryFeatures = primaryFeatures.slice(-160);
	} else {
		osintFeatures.push(feature);
		osintFeatures = osintFeatures.slice(-160);
	}

	refreshMapSources();
	addPipelineLogEntry(feature);
	focusOnIncomingFeature(feature);

	const sourceLabel = sourceType === "primary" ? "primary" : "secondary";
	setStatus(`Agent triage: ${packet.kind} packet from ${packet.country} indexed as ${sourceLabel} signal.`);
}

function primeSimulation() {
	primarySeed.slice(0, 6).forEach((packet) => {
		primaryFeatures.push(createPacketFeature(packet, "primary"));
	});

	osintSeed.slice(0, 4).forEach((packet) => {
		osintFeatures.push(createPacketFeature(packet, "osint"));
	});

	refreshMapSources();

	primaryFeatures.forEach((feature) => addPipelineLogEntry(feature));
	osintFeatures.forEach((feature) => addPipelineLogEntry(feature));
}

function wireCountryHover() {
	if (!map || hoverHandlersWired || !map.getLayer("countries-fill")) {
		return;
	}

	hoverHandlersWired = true;

	map.on("mouseenter", "countries-fill", () => {
		map.getCanvas().style.cursor = "crosshair";
	});

	map.on("mouseleave", "countries-fill", () => {
		map.getCanvas().style.cursor = "";

		if (hoveredCountryFeatureId !== null) {
			map.setFeatureState({ source: "countries", id: hoveredCountryFeatureId }, { hover: false });
			hoveredCountryFeatureId = null;
		}
	});

	map.on("mousemove", "countries-fill", (event) => {
		const feature = event.features && event.features[0];
		if (!feature) {
			return;
		}

		if (hoveredCountryFeatureId !== null && hoveredCountryFeatureId !== feature.id) {
			map.setFeatureState({ source: "countries", id: hoveredCountryFeatureId }, { hover: false });
		}

		hoveredCountryFeatureId = feature.id;
		map.setFeatureState({ source: "countries", id: hoveredCountryFeatureId }, { hover: true });

		const countryName = feature.properties.name;
		if (!autoFocusEnabled) {
			return;
		}

		if (activeCountry === countryName) {
			return;
		}

		setFocusedCountry(countryName, { shouldMoveMap: true, zoomFloor: 3.2, duration: 850 });
	});
}

if (map) {
	map.on("load", () => {
		try {
	map.addSource("relief-imagery", {
		type: "raster",
		tiles: [
			"https://services.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}"
		],
		tileSize: 256
	});

	map.addSource("relief-shade", {
		type: "raster",
		tiles: [
			"https://services.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}"
		],
		tileSize: 256
	});

	map.addLayer({
		id: "base-imagery",
		type: "raster",
		source: "relief-imagery",
		paint: {
			"raster-opacity": 0.42,
			"raster-resampling": "linear"
		}
	});

	map.addLayer({
		id: "base-relief",
		type: "raster",
		source: "relief-shade",
		paint: {
			"raster-opacity": 0.46,
			"raster-resampling": "linear"
		}
	});

	map.addSource("countries", {
		type: "geojson",
		data: buildCountryGeoJSON()
	});

	map.addSource("country-labels", {
		type: "geojson",
		data: {
			type: "FeatureCollection",
			features: Object.entries(countryProfiles).map(([name, profile], idx) => ({
				type: "Feature",
				id: `label-${idx + 1}`,
				properties: { name: name.toUpperCase() },
				geometry: {
					type: "Point",
					coordinates: profile.center
				}
			}))
		}
	});

	map.addSource("world-borders", {
		type: "geojson",
		data: "https://cdn.jsdelivr.net/gh/datasets/geo-countries@master/data/countries.geojson"
	});

	map.addLayer({
		id: "world-borders",
		type: "line",
		source: "world-borders",
		paint: {
			"line-color": "rgba(255,255,255,0.18)",
			"line-width": ["interpolate", ["linear"], ["zoom"], 1, 0.32, 5, 1.02, 8, 1.45],
			"line-opacity": ["interpolate", ["linear"], ["zoom"], 1, 0.3, 8, 0.66]
		}
	});

	map.addSource("country-heat", {
		type: "geojson",
		data: buildCountryHeatGeoJSON()
	});

	map.addLayer({
		id: "country-heat-aura",
		type: "heatmap",
		source: "country-heat",
		maxzoom: 9,
		paint: {
			"heatmap-weight": ["interpolate", ["linear"], ["get", "intensity"], 0, 0, 0.4, 0.18, 1.2, 0.55, 3.4, 1],
			"heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 1, 1.15, 5, 1.48, 9, 1.92],
			"heatmap-color": [
				"interpolate",
				["linear"],
				["heatmap-density"],
				0,
				"rgba(0,0,0,0.0)",
				0.1,
				"rgba(46,204,113,0.22)",
				0.28,
				"rgba(129,223,74,0.48)",
				0.45,
				"rgba(255,224,84,0.68)",
				0.62,
				"rgba(255,167,60,0.82)",
				0.8,
				"rgba(255,96,48,0.92)",
				1,
				"rgba(225,25,32,0.96)"
			],
			"heatmap-radius": ["interpolate", ["linear"], ["zoom"], 1, 20, 5, 46, 9, 88],
			"heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 1, 0.58, 9, 0.9]
		}
	});

	map.addLayer({
		id: "country-heat-glow",
		type: "circle",
		source: "country-heat",
		minzoom: 2,
		paint: {
			"circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 6, 9, 24],
			"circle-color": [
				"interpolate",
				["linear"],
				["get", "intensity"],
				0,
				"rgba(46,204,113,0.4)",
				1.2,
				"rgba(255,224,84,0.46)",
				2.2,
				"rgba(255,140,54,0.54)",
				3.4,
				"rgba(225,25,32,0.64)"
			],
			"circle-blur": 0.9,
			"circle-opacity": ["interpolate", ["linear"], ["get", "intensity"], 0, 0.06, 3.4, 0.32]
		}
	});

	map.addLayer({
		id: "country-heat-core",
		type: "circle",
		source: "country-heat",
		minzoom: 3.2,
		paint: {
			"circle-radius": ["interpolate", ["linear"], ["zoom"], 3.2, 1.1, 9, 3.2],
			"circle-color": [
				"interpolate",
				["linear"],
				["get", "intensity"],
				0,
				"rgba(115,255,167,0.66)",
				1.2,
				"rgba(255,236,130,0.72)",
				2.2,
				"rgba(255,157,80,0.8)",
				3.4,
				"rgba(255,69,69,0.9)"
			],
			"circle-opacity": ["interpolate", ["linear"], ["get", "intensity"], 0, 0.1, 3.4, 0.5]
		}
	});

	map.addLayer({
		id: "countries-fill",
		type: "fill",
		source: "countries",
		paint: {
			"fill-color": "#f4f4f4",
			"fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.08, 0.0]
		}
	});

	map.addLayer({
		id: "countries-outline",
		type: "line",
		source: "countries",
		paint: {
			"line-color": ["case", ["boolean", ["feature-state", "hover"], false], "#000000", "rgba(248,248,248,0.4)"],
			"line-width": ["case", ["boolean", ["feature-state", "hover"], false], 2.1, 0.35],
			"line-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.94, 0.3]
		}
	});

	map.moveLayer("country-heat-aura", "countries-outline");
	map.moveLayer("country-heat-glow", "countries-outline");
	map.moveLayer("country-heat-core", "countries-outline");

	map.addLayer({
		id: "country-labels",
		type: "symbol",
		source: "country-labels",
		layout: {
			"text-field": ["get", "name"],
			"text-font": ["Open Sans Semibold"],
			"text-size": ["interpolate", ["linear"], ["zoom"], 1, 11, 5, 14],
			"text-letter-spacing": 0.08,
			"text-allow-overlap": false
		},
		paint: {
			"text-color": "rgba(245,245,245,0.94)",
			"text-halo-color": "rgba(0,0,0,0.9)",
			"text-halo-width": 1.2,
			"text-opacity": 0.92
		}
	});

	map.addSource("primary-reports", {
		type: "geojson",
		data: toFeatureCollection([])
	});

	map.addSource("osint-reports", {
		type: "geojson",
		data: toFeatureCollection([])
	});

	map.addLayer({
		id: "primary-shadow",
		type: "circle",
		source: "primary-reports",
		layout: {
			"circle-sort-key": ["coalesce", ["get", "strength"], 0.65]
		},
		paint: {
			"circle-color": "rgba(0,0,0,0.56)",
			"circle-radius": ["*", ["interpolate", ["linear"], ["zoom"], 1, 4, 8, 12], ["coalesce", ["get", "strength"], 0.65]],
			"circle-opacity": 0.42,
			"circle-blur": 0.24,
			"circle-translate": [1, 1]
		}
	});

	map.addLayer({
		id: "primary-aura",
		type: "circle",
		source: "primary-reports",
		layout: {
			"circle-sort-key": ["coalesce", ["get", "strength"], 0.65]
		},
		paint: {
			"circle-color": "#2ff27a",
			"circle-radius": ["*", ["interpolate", ["linear"], ["zoom"], 1, 8, 8, 20], ["coalesce", ["get", "strength"], 0.65]],
			"circle-opacity": 0.23,
			"circle-blur": 0.82
		}
	});

	map.addLayer({
		id: "primary-ring",
		type: "circle",
		source: "primary-reports",
		layout: {
			"circle-sort-key": ["coalesce", ["get", "strength"], 0.65]
		},
		paint: {
			"circle-color": "rgba(0,0,0,0)",
			"circle-stroke-color": "rgba(171,255,203,0.95)",
			"circle-stroke-width": ["*", ["interpolate", ["linear"], ["zoom"], 1, 0.9, 8, 2], ["coalesce", ["get", "strength"], 0.65]],
			"circle-radius": ["*", ["interpolate", ["linear"], ["zoom"], 1, 3.1, 8, 8.2], ["coalesce", ["get", "strength"], 0.65]],
			"circle-opacity": 0.98
		}
	});

	map.addLayer({
		id: "primary-core",
		type: "circle",
		source: "primary-reports",
		layout: {
			"circle-sort-key": ["coalesce", ["get", "strength"], 0.65]
		},
		paint: {
			"circle-color": "#f6fff8",
			"circle-stroke-color": "#2ff27a",
			"circle-stroke-width": 1.2,
			"circle-radius": ["*", ["interpolate", ["linear"], ["zoom"], 1, 1.6, 8, 4.2], ["coalesce", ["get", "strength"], 0.65]],
			"circle-opacity": 0.98
		}
	});

	map.addLayer({
		id: "primary-spec",
		type: "circle",
		source: "primary-reports",
		paint: {
			"circle-color": "rgba(255,255,255,0.88)",
			"circle-radius": ["*", ["interpolate", ["linear"], ["zoom"], 1, 0.55, 8, 1.6], ["coalesce", ["get", "strength"], 0.65]],
			"circle-opacity": 0.85,
			"circle-translate": [1, -1]
		}
	});

	map.addLayer({
		id: "osint-shadow",
		type: "circle",
		source: "osint-reports",
		layout: {
			"circle-sort-key": ["coalesce", ["get", "strength"], 0.62]
		},
		paint: {
			"circle-color": "rgba(0,0,0,0.55)",
			"circle-radius": ["*", ["interpolate", ["linear"], ["zoom"], 1, 4, 8, 11], ["coalesce", ["get", "strength"], 0.62]],
			"circle-opacity": 0.38,
			"circle-blur": 0.22,
			"circle-translate": [1, 1]
		}
	});

	map.addLayer({
		id: "osint-aura",
		type: "circle",
		source: "osint-reports",
		layout: {
			"circle-sort-key": ["coalesce", ["get", "strength"], 0.62]
		},
		paint: {
			"circle-color": "#ff9b38",
			"circle-radius": ["*", ["interpolate", ["linear"], ["zoom"], 1, 7, 8, 17], ["coalesce", ["get", "strength"], 0.62]],
			"circle-opacity": 0.2,
			"circle-blur": 0.8
		}
	});

	map.addLayer({
		id: "osint-ring",
		type: "circle",
		source: "osint-reports",
		layout: {
			"circle-sort-key": ["coalesce", ["get", "strength"], 0.62]
		},
		paint: {
			"circle-color": "rgba(0,0,0,0)",
			"circle-stroke-color": "rgba(255,216,175,0.96)",
			"circle-stroke-width": ["*", ["interpolate", ["linear"], ["zoom"], 1, 0.85, 8, 1.7], ["coalesce", ["get", "strength"], 0.62]],
			"circle-radius": ["*", ["interpolate", ["linear"], ["zoom"], 1, 2.8, 8, 7], ["coalesce", ["get", "strength"], 0.62]],
			"circle-opacity": 0.96
		}
	});

	map.addLayer({
		id: "osint-core",
		type: "circle",
		source: "osint-reports",
		layout: {
			"circle-sort-key": ["coalesce", ["get", "strength"], 0.62]
		},
		paint: {
			"circle-color": "#fff5e8",
			"circle-stroke-color": "#ff9b38",
			"circle-stroke-width": 1.1,
			"circle-radius": ["*", ["interpolate", ["linear"], ["zoom"], 1, 1.5, 8, 3.8], ["coalesce", ["get", "strength"], 0.62]],
			"circle-opacity": 0.98
		}
	});

	map.addLayer({
		id: "osint-spec",
		type: "circle",
		source: "osint-reports",
		paint: {
			"circle-color": "rgba(255,255,255,0.78)",
			"circle-radius": ["*", ["interpolate", ["linear"], ["zoom"], 1, 0.45, 8, 1.3], ["coalesce", ["get", "strength"], 0.62]],
			"circle-opacity": 0.76,
			"circle-translate": [1, -1]
		}
	});

	map.moveLayer("country-labels");

	primeSimulation();
	wireCountryHover();
	startPacketStream();

	setStatus("Agent mesh online. Hover a country to inspect image and audio traces.");
} catch (error) {
	console.error("Map initialization fallback", error);

	if (!map.getSource("primary-reports")) {
		map.addSource("primary-reports", {
			type: "geojson",
			data: toFeatureCollection([])
		});
	}

	if (!map.getSource("osint-reports")) {
		map.addSource("osint-reports", {
			type: "geojson",
			data: toFeatureCollection([])
		});
	}

	if (!map.getLayer("primary-core")) {
		map.addLayer({
			id: "primary-core",
			type: "circle",
			source: "primary-reports",
			paint: {
				"circle-color": "#2ff27a",
				"circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 2, 8, 6],
				"circle-opacity": 0.9
			}
		});
	}

	if (!map.getLayer("osint-core")) {
		map.addLayer({
			id: "osint-core",
			type: "circle",
			source: "osint-reports",
			paint: {
				"circle-color": "#ff9b38",
				"circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 2, 8, 6],
				"circle-opacity": 0.85
			}
		});
	}

	primeSimulation();
	startPacketStream();
	setStatus("Advanced map skin failed. Running resilient safe mode.");
}
	});

	map.on("error", (event) => {
	if (!event || !event.error) {
		return;
	}

	if (event.sourceId && event.sourceId !== "relief-imagery" && event.sourceId !== "relief-shade") {
		return;
	}

	const imagerySource = map.getSource("relief-imagery");
	const shadeSource = map.getSource("relief-shade");
	if (!imagerySource && !shadeSource) {
		setStatus("Basemap source unavailable. Heat and incident layers are still active.");
		return;
	}

	if (event.sourceId === "relief-shade") {
		safeSetPaint("base-relief", "raster-opacity", 0);
		safeSetPaint("base-imagery", "raster-opacity", 0.48);
		setStatus("Relief overlay unavailable. Running monochrome physical basemap.");
		return;
	}

	if (event.sourceId === "relief-imagery" && basemapFallbackStage === 0) {
		safeSetPaint("base-imagery", "raster-opacity", 0);
		safeSetPaint("base-relief", "raster-opacity", 0.72);

		basemapFallbackStage = 1;
		setStatus("Physical relief base unavailable. Switched to hillshade-only relief.");
		return;
	}

	if (event.sourceId === "relief-imagery" && basemapFallbackStage === 1) {
		setStatus("Primary relief source still unavailable. Running hillshade-only relief.");
		return;
	}

	setStatus("Basemap providers unavailable. Relief layers could not be loaded.");
	});
}
