import type { CareerProspect } from "@/lib/types";

// A product-led learning example inspired by Julie's work, not her personal CV.
export const DEFAULT_DEMO_CAPABILITIES = ["Product Knowledge", "User Research"];

export function demoRoleModel(career: string): CareerProspect {
  const common = { roleModelTitle: "Method inspiration, not an identical career path", whatTheyDidDifferently: "", whyRelevant: "" };
  if (/analys|research|intelligence|data|insight|financial/i.test(career)) return {
    ...common, name: "Hans Rosling", wikipediaTitle: "Hans Rosling",
    imageUrl: "https://s3.eu-west-1.amazonaws.com/static.gapminder.org/GapminderMedia/wp-uploads/20161011112602/Hans_Rosling_111-150x150.jpg",
    profileUrl: "https://www.gapminder.org/about/press-room/biographies/",
    whatTheyBuilt: "Gapminder co-founder who made complex data understandable through visual explanations.",
    stealThisMove: `For a ${career.toLowerCase()} project, turn one dataset into a before-and-after chart, explain the surprising finding in one sentence, then recommend one action. A practice exercise inspired by his communication approach.`,
  };
  if (/marketing|sales|revenue|brand|commercial|growth|localiz|content|copy|market/i.test(career)) return {
    ...common, name: "April Dunford", wikipediaTitle: "April Dunford",
    imageUrl: "https://cdn.prod.website-files.com/5ebd7ae93cd2fe377a4ca05e/654bcd298174b3400b257581_April_Close-Cropped-p-500.png",
    profileUrl: "https://www.aprildunford.com/books",
    whatTheyBuilt: "Author of Obviously Awesome, a practical framework for positioning products around differentiated customer value.",
    stealThisMove: `For a ${career.toLowerCase()} offer, write a one-page comparison: what the buyer uses today, your distinct advantage, and the customer who benefits most. Use it to sharpen your next outreach message. An exercise inspired by her positioning framework.`,
  };
  return {
    ...common, name: "Julie Zhuo", wikipediaTitle: "Julie Zhuo",
    imageUrl: "https://www.juliezhuo.com/book/jz.jpg",
    profileUrl: "https://www.juliezhuo.com/book/manager.html",
    whatTheyBuilt: "Author of The Making of a Manager, focused on learning to lead teams and improve how work gets done.",
    stealThisMove: `For a ${career.toLowerCase()} project, agree on one success metric, identify who owns each handoff, and hold a short weekly review of what blocked progress. A practical exercise inspired by her management focus.`,
  };
}
