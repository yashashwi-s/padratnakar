import lalita from "../../data/collections/mahabhav-kallolini/art/lalita.png?inline";
import vishakha from "../../data/collections/mahabhav-kallolini/art/vishakha.png?inline";
import chitra from "../../data/collections/mahabhav-kallolini/art/chitra.png?inline";
import indulekha from "../../data/collections/mahabhav-kallolini/art/indulekha.png?inline";
import champakalata from "../../data/collections/mahabhav-kallolini/art/champakalata.png?inline";
import rangadevi from "../../data/collections/mahabhav-kallolini/art/rangadevi.png?inline";
import tungavidya from "../../data/collections/mahabhav-kallolini/art/tungavidya.png?inline";
import sudevi from "../../data/collections/mahabhav-kallolini/art/sudevi.png?inline";
import metadata from "../../data/collections/mahabhav-kallolini/illustrations.json" with { type: "json" };
const resources = {
  lalita,
  vishakha,
  chitra,
  indulekha,
  champakalata,
  rangadevi,
  tungavidya,
  sudevi,
};
export const sakhiIllustrations = metadata.map((item) => ({
  ...item,
  href: resources[item.id],
}));
