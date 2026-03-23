/**
 * @module CatNameHero
 * @description Full-viewport hero section that presents the cat's chosen name
 * in large, bold display typography. Reads catChosenName from the Zustand store.
 * Shows placeholder dashes when the name is not yet set.
 */

import useAppStore from "@/store/appStore";

const PLACEHOLDER = "———";

export function CatNameHero() {
        const catChosenName = useAppStore((s) => s.siteSettings.catChosenName);

        const isSet = catChosenName?.is_set ?? false;

        const firstName = isSet && catChosenName?.first_name ? catChosenName.first_name : PLACEHOLDER;
        const middleNames =
                isSet && catChosenName?.middle_names?.length
                        ? catChosenName.middle_names
                        : [PLACEHOLDER];
        const lastName = isSet && catChosenName?.last_name ? catChosenName.last_name : PLACEHOLDER;

        const nameParts = [firstName, ...middleNames, lastName];

        return (
                <section
                        className="cat-name-hero"
                        aria-label="Cat name reveal"
                >
                        <div className="cat-name-hero__inner">
                                <p className="cat-name-hero__greeting">Hello. My name is</p>

                                <div className="cat-name-hero__name" aria-label={isSet ? nameParts.join(" ") : "Name not yet chosen"}>
                                        {nameParts.map((part, i) => (
                                                <span
                                                        key={i}
                                                        className={`cat-name-hero__part${!isSet ? " cat-name-hero__part--placeholder" : ""}`}
                                                >
                                                        {part}
                                                </span>
                                        ))}
                                </div>
                        </div>

                        <div className="cat-name-hero__scroll-cue" aria-hidden="true">
                                <span className="cat-name-hero__scroll-label">scroll</span>
                                <svg
                                        className="cat-name-hero__scroll-arrow"
                                        width="20"
                                        height="20"
                                        viewBox="0 0 20 20"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                >
                                        <path
                                                d="M10 3v14M4 11l6 6 6-6"
                                                stroke="currentColor"
                                                strokeWidth="1.5"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                        />
                                </svg>
                        </div>
                </section>
        );
}
