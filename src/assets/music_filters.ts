// Filter keys MUST be lowercase
/*
const filtersOld = {
	'bassboost': {
		'equalizer': [
			...Array(6).fill(0.22).map((x, i) => ({  'band': i, 'gain': x })),
		],
	},
	'karaoke': {
		'karaoke': {
			'level': 1.5,
			'monoLevel': 1.0,
			'filterBand': 220.0,
			'filterWidth': 100.0,
		},
	},
	'doubletime': {
		'timescale': {
			'speed': 1.5,
		},
	},
	'nightcore': {
		'timescale': {
			'rate': 1.5,
		},
	},
	'vaporwave': {
		'timescale': {
			'speed': 0.9,
			'pitch': 0.70,
		},
	},
	'8d': {
		'rotation': {
			'rotationHz': 0.2,
		},
	},
	'tremolo': {
		'tremolo': {
			'frequency': 0.75,
			'depth': 0.75,
		},
	},
};
*/
export default {
	'nightcore': {
		'timescale': {
			speed: 1.2999999523162842,
			pitch: 1.2999999523162842,
			rate: 1.1,
		},
	},
	'vaporwave': {
		'equalizer': [
			{ 'band': 1, 'gain': 0.3 },
			{ 'band': 0, 'gain': 0.3 },
		],
		'timescale': { 'pitch': 0.5 },
		'tremolo': { 'depth': 0.3, 'frequency': 14 },
	},
	'bassboost': {
		'equalizer': [
			{ 'band': 0, 'gain': 0.6 },
			{ 'band': 1, 'gain': 0.67 },
			{ 'band': 2, 'gain': 0.67 },
			{ 'band': 3, 'gain': 0 },
			{ 'band': 4, 'gain': -0.5 },
			{ 'band': 5, 'gain': 0.15 },
			{ 'band': 6, 'gain': -0.45 },
			{ 'band': 7, 'gain': 0.23 },
			{ 'band': 8, 'gain': 0.35 },
			{ 'band': 9, 'gain': 0.45 },
			{ 'band': 10, 'gain': 0.55 },
			{ 'band': 11, 'gain': 0.6 },
			{ 'band': 12, 'gain': 0.55 },
			{ 'band': 13, 'gain': 0 },
		],
	},
	'pop': {
		'equalizer': [
			{ 'band': 0, 'gain': 0.65 },
			{ 'band': 1, 'gain': 0.45 },
			{ 'band': 2, 'gain': -0.45 },
			{ 'band': 3, 'gain': -0.65 },
			{ 'band': 4, 'gain': -0.35 },
			{ 'band': 5, 'gain': 0.45 },
			{ 'band': 6, 'gain': 0.55 },
			{ 'band': 7, 'gain': 0.6 },
			{ 'band': 8, 'gain': 0.6 },
			{ 'band': 9, 'gain': 0.6 },
			{ 'band': 10, 'gain': 0 },
			{ 'band': 11, 'gain': 0 },
			{ 'band': 12, 'gain': 0 },
			{ 'band': 13, 'gain': 0 },
		],
	},
	'soft': {
		'lowPass': {
			'smoothing': 20.0,
		},
	},
	'treblebass': {
		'equalizer': [
			{ 'band': 0, 'gain': 0.6 },
			{ 'band': 1, 'gain': 0.67 },
			{ 'band': 2, 'gain': 0.67 },
			{ 'band': 3, 'gain': 0 },
			{ 'band': 4, 'gain': -0.5 },
			{ 'band': 5, 'gain': 0.15 },
			{ 'band': 6, 'gain': -0.45 },
			{ 'band': 7, 'gain': 0.23 },
			{ 'band': 8, 'gain': 0.35 },
			{ 'band': 9, 'gain': 0.45 },
			{ 'band': 10, 'gain': 0.55 },
			{ 'band': 11, 'gain': 0.6 },
			{ 'band': 12, 'gain': 0.55 },
			{ 'band': 13, 'gain': 0 },
		],
	},
	'8d': {
		'rotation': {
			'rotationHz': 0.2,
		},
	},
	'karaoke': {
		'karaoke': {
			'level': 1.0,
			'monoLevel': 1.0,
			'filterBand': 220.0,
			'filterWidth': 100.0,
		},
	},
	'vibrato': {
		'vibrato': {
			'frequency': 10,
			'depth': 0.9,
		},
	},
	'tremolo': {
		'tremolo': {
			'frequency': 10,
			'depth': 0.5,
		},
	},
	'doubletime': {
		'timescale': {
			'speed': 1.5,
		},
	},
};