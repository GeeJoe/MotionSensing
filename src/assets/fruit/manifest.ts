import apple from "./apple.png";
import appleLeft from "./apple-left.png";
import appleRight from "./apple-right.png";
import banana from "./banana.png";
import bananaLeft from "./banana-left.png";
import bananaRight from "./banana-right.png";
import bomb from "./bomb.png";
import dragonFruit from "./dragon-fruit.png";
import dragonFruitLeft from "./dragon-fruit-left.png";
import dragonFruitRight from "./dragon-fruit-right.png";
import kiwi from "./kiwi.png";
import kiwiLeft from "./kiwi-left.png";
import kiwiRight from "./kiwi-right.png";
import juiceSplash from "./juice-splash.png";
import orange from "./orange.png";
import orangeLeft from "./orange-left.png";
import orangeRight from "./orange-right.png";
import pineapple from "./pineapple.png";
import pineappleLeft from "./pineapple-left.png";
import pineappleRight from "./pineapple-right.png";
import strawberry from "./strawberry.png";
import strawberryLeft from "./strawberry-left.png";
import strawberryRight from "./strawberry-right.png";
import watermelon from "./watermelon.png";
import watermelonLeft from "./watermelon-left.png";
import watermelonRight from "./watermelon-right.png";
import type { FruitType } from "../../domain/fruitSlice";

export interface FruitAssetSet {
  whole: string;
  left: string;
  right: string;
}

export const fruitAssets: Record<FruitType, FruitAssetSet> = {
  apple: { whole: apple, left: appleLeft, right: appleRight },
  banana: { whole: banana, left: bananaLeft, right: bananaRight },
  "dragon-fruit": { whole: dragonFruit, left: dragonFruitLeft, right: dragonFruitRight },
  kiwi: { whole: kiwi, left: kiwiLeft, right: kiwiRight },
  orange: { whole: orange, left: orangeLeft, right: orangeRight },
  pineapple: { whole: pineapple, left: pineappleLeft, right: pineappleRight },
  strawberry: { whole: strawberry, left: strawberryLeft, right: strawberryRight },
  watermelon: { whole: watermelon, left: watermelonLeft, right: watermelonRight },
};

export const bombAsset = bomb;
export const juiceSplashAsset = juiceSplash;
