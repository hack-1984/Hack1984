/**
 * Fallback nonprofit graveyard: well-documented closures and failed programs,
 * written by hand. Used when search returns nothing usable for a nonprofit idea.
 *
 * Facts are deliberately sparse and each record links the source it came from.
 * `raisedUsd` holds a peak annual budget or revenue, and only where a source
 * states one in dollars (the UI labels it "Peak budget"). similarity /
 * threatens / lesson are filled per idea at runtime, as for startups.
 */
import type { Known } from "./known";

export const KNOWN_NONPROFIT_FAILURES: Known[] = [
  {
    id: "np-playpumps",
    name: "PlayPumps International",
    died: 2010,
    category: "rural water access",
    causeTags: ["program-didnt-work", "no-community-buy-in"],
    causeOneWord: "Design",
    epitaph: "A merry-go-round nobody wanted to push.",
    story:
      "PlayPumps installed merry-go-round water pumps that children's play would power. The pumps produced less water than villages needed, cost about four times a regular pump and broke, and operations ended in 2010 with the inventory passed to Water For People.",
    timeline: [{ year: 2010, event: "Operations ended; inventory went to Water For People" }],
    defaultLesson: "Test the program with the people who will use it every day before scaling it.",
    defaultLessonLabel: "Pilot with users",
    sources: ["https://www.designreview.byu.edu/collections/the-playpump-lessons-learned-from-a-design-failure"],
  },
  {
    id: "np-kids-company",
    name: "Kids Company",
    founded: 1996,
    died: 2015,
    category: "children's social services",
    causeTags: ["funding-concentration", "governance"],
    causeOneWord: "Dependence",
    epitaph: "Nineteen years of help, one grant from collapse.",
    story:
      "Kids Company, a UK children's charity, received at least £42 million in central government grants over the years. Officials cited uncertain cash flow and poor financial management, government funding stopped, and the charity was wound up as insolvent in August 2015.",
    timeline: [
      { year: 1996, event: "Founded" },
      { year: 2015, event: "Government funding withdrawn; charity closed in August and was wound up" },
    ],
    defaultLesson: "Never let one funder become the difference between open and closed.",
    defaultLessonLabel: "Diversify funders",
    sources: [
      "https://www.nao.org.uk/wp-content/uploads/2015/10/Investigation-the-governments-funding-of-Kids-Company-Summary.pdf",
    ],
  },
  {
    id: "np-hull-house",
    name: "Jane Addams Hull House Association",
    founded: 1889,
    died: 2012,
    category: "community social services",
    causeTags: ["funding-concentration", "ran-out-of-cash"],
    causeOneWord: "Contracts",
    epitaph: "A century of service, ended by one revenue stream.",
    story:
      "The association served more than 60,000 clients in 50 programs across Chicago. It had shifted toward government funding until private money was about 10% of its budget, and when government funding fell and demand rose it closed abruptly in January 2012.",
    timeline: [
      { year: 1889, event: "Founded" },
      { year: 2012, event: "Closed in January, citing government funding cuts" },
    ],
    defaultLesson: "Keep private and individual giving strong even when contracts are easy.",
    defaultLessonLabel: "Balanced funding mix",
    sources: ["https://www.npr.org/2012/01/27/145950493/jane-addams-hull-house-to-close"],
  },
  {
    id: "np-acorn",
    name: "ACORN",
    founded: 1970,
    died: 2010,
    category: "community organizing",
    causeTags: ["trust-scandal", "governance"],
    causeOneWord: "Trust",
    epitaph: "Forty years organizing, undone in one news cycle.",
    story:
      "ACORN organized low-income communities for four decades. After 2009 undercover videos, Congress cut its federal funding, agencies ended contracts and private donors pulled back, and with mismanagement also reported it disbanded its chapters and filed for bankruptcy in November 2010.",
    timeline: [
      { year: 1970, event: "Founded" },
      { year: 2009, event: "Undercover videos; federal funding suspended and donors withdraw" },
      { year: 2010, event: "Chapters disbanded; bankruptcy filed in November" },
    ],
    defaultLesson: "Build controls and transparency strong enough to survive public scrutiny.",
    defaultLessonLabel: "Trust and controls",
    sources: [
      "https://www.philanthropy.com/news/acorn-closes-for-good-with-bankruptcy-filing/",
      "https://en.wikipedia.org/wiki/ACORN_2009_undercover_videos_controversy",
    ],
  },
  {
    id: "np-fegs",
    name: "FEGS Health & Human Services",
    died: 2015,
    raisedUsd: 250_000_000,
    category: "human services",
    causeTags: ["governance", "ran-out-of-cash"],
    causeOneWord: "Deficit",
    epitaph: "Too big to notice the hole until it swallowed everything.",
    story:
      "FEGS was one of New York's largest human services nonprofits, serving about 120,000 people a year on a budget of roughly $250 million. It announced in January 2015 that it would dissolve after a $19.4 million deficit, filed for Chapter 11 in March, and its programs were transferred to other providers.",
    timeline: [{ year: 2015, event: "Announced dissolution in January; Chapter 11 filing in March" }],
    defaultLesson: "Keep cash reserves and board-level financial oversight that grow with the budget.",
    defaultLessonLabel: "Reserves and oversight",
    sources: [
      "https://nonprofitquarterly.org/anatomy-of-a-mega-nonprofit-headed-for-bankruptcy/",
      "https://forward.com/news/322260/fegs-faces-federal-criminal-probe-over-fiscal-collapse",
    ],
  },
  {
    id: "np-nyc-opera",
    name: "New York City Opera",
    founded: 1943,
    died: 2013,
    category: "performing arts",
    causeTags: ["governance", "ran-out-of-cash"],
    causeOneWord: "Endowment",
    epitaph: "Spent its future to pay for the present.",
    story:
      "New York City Opera drew down its endowment for years to cover debts and operating costs; one account puts the fall at $51.6 million in 2001 to $5.2 million by June 2013. It cancelled its season and filed for Chapter 11 in October 2013.",
    timeline: [
      { year: 1943, event: "Founded" },
      { year: 2013, event: "Season cancelled; Chapter 11 filing in October" },
    ],
    defaultLesson: "Fund operations from recurring income, not by drawing down reserves.",
    defaultLessonLabel: "Protect the reserves",
    sources: [
      "https://www.philanthropy.com/opinion/opinion-raiding-endowment-fueled-ny-city-operas-demise/",
      "https://nonprofitquarterly.org/curtain-comes-down-on-new-york-city-opera/",
    ],
  },
  {
    id: "np-burlington-college",
    name: "Burlington College",
    died: 2016,
    category: "small nonprofit college",
    causeTags: ["governance", "ran-out-of-cash"],
    causeOneWord: "Debt",
    epitaph: "Bought the lakefront, lost the campus.",
    story:
      "Burlington College, a small Vermont college, agreed to buy 33 lakefront acres for about $10 million in 2010. The debt became what officials called a crushing weight, its bank withdrew a credit line, and trustees voted to close in May 2016.",
    timeline: [
      { year: 2010, event: "Agreed to buy lakefront land with borrowed money" },
      { year: 2016, event: "Credit line withdrawn; trustees voted to close in May" },
    ],
    defaultLesson: "Don't take on capital debt your recurring income can't carry.",
    defaultLessonLabel: "Grow within means",
    sources: ["https://vtdigger.org/2016/05/27/students-alumni-and-faculty-struggle-for-answers-after-burlington-college-closure/"],
  },
  {
    id: "np-invisible-children",
    name: "Invisible Children",
    died: 2015,
    raisedUsd: 26_500_000,
    category: "advocacy and awareness campaigns",
    causeTags: ["funding-concentration", "mission-drift"],
    causeOneWord: "Viral",
    epitaph: "One video raised millions; the next year didn't.",
    story:
      "Invisible Children's Kony 2012 video went viral and revenue reached about $26.5 million in 2012, then fell to $4.9 million in 2013. In December 2014 it announced it would close its U.S. operations and hand its Africa programs to partners.",
    timeline: [
      { year: 2012, event: "Kony 2012 video; revenue about $26.5 million" },
      { year: 2013, event: "Revenue fell to about $4.9 million" },
      { year: 2014, event: "Announced wind-down of U.S. operations in December" },
    ],
    defaultLesson: "Turn one-time attention into recurring supporters before the spike fades.",
    defaultLessonLabel: "Recurring supporters",
    sources: ["https://time.com/3634552/kony-2012-shut-down-invisible-children", "https://www.huffpost.com/entry/invisible-children-closing_n_6329990"],
  },
  {
    id: "np-new-era",
    name: "Foundation for New Era Philanthropy",
    died: 1995,
    category: "charitable giving intermediary",
    causeTags: ["trust-scandal", "governance"],
    causeOneWord: "Fraud",
    epitaph: "Promised to double every gift. Didn't.",
    story:
      "New Era told charities and donors that money they placed with it would be doubled in six months by anonymous donors. It was a Ponzi scheme that collapsed in 1995, hitting hundreds of charities, and its founder was sentenced to 12 years in prison.",
    timeline: [{ year: 1995, event: "Collapsed in May amid a criminal probe" }],
    defaultLesson: "Verify any funding offer that sounds too good, and never stake programs on it.",
    defaultLessonLabel: "Verify funders",
    sources: ["https://en.wikipedia.org/wiki/Foundation_for_New_Era_Philanthropy"],
  },
];
