import discardUnused from "postcss-discard-unused";

export default {
	plugins: {
		"@tailwindcss/postcss": {},
		autoprefixer: {},
		...(process.env.NODE_ENV === "production" && {
			"postcss-discard-unused": discardUnused({
				fontFace: true,
				counterStyle: true,
				keyframes: true,
				namespace: true,
			}),
		}),
	},
};
