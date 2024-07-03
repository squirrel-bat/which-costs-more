import gzip
import json
import os
import shutil
import requests

VERSION = 1.3
HR = "-" * shutil.get_terminal_size().columns
BULK_URL = "https://api.scryfall.com/bulk-data/default-cards"
SETS_URL = "https://api.scryfall.com/sets"
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "../src/data.gzip")
GREEN = "\033[92m"
ENDCOLOR = "\033[0m"


def get_bulk_json():
    print(f"Fetching Bulk URI from {BULK_URL}")
    res = requests.get(BULK_URL).json()
    print(f"{GREEN}✔ Success{ENDCOLOR}")
    print(
        f"Fetching Bulk JSON (~ {round(res['size'] / (1024**2), 2)} MiB) from {res['download_uri']}"
    )
    return requests.get(res["download_uri"]).json()


def parse_data(data_json):
    card_data = [
        {
            "name": card["name"],
            "img_uri": card["image_uris"]["normal"],
            "scryfall_uri": card["scryfall_uri"],
            "prices": {
                "usd": card["prices"]["usd"],
                "eur": card["prices"]["eur"],
            },
            "legalities": {
                "standard": card["legalities"]["standard"],
                "pioneer": card["legalities"]["pioneer"],
                "modern": card["legalities"]["modern"],
                "legacy": card["legalities"]["legacy"],
                "commander": card["legalities"]["commander"],
                "pauper": card["legalities"]["pauper"],
            },
            "rarity": card["rarity"],
            "set": {
                "name": card["set_name"],
                "code": card["set"].upper(),
            },
        }
        for card in data_json
        if is_valid_card(card)
    ]
    percent = (len(card_data) / len(data_json)) * 100.0
    print(f"Ported:  {len(card_data)} cards ({round(percent, 2)}%)")
    return card_data


def is_valid_card(card):
    return (
        card["prices"]["usd"] is not None
        and card["prices"]["eur"] is not None
        and "image_uris" in card
        and "normal" in card["image_uris"]
        and card["lang"] == "en"
        and card["digital"] is False
        and "paper" in card["games"]
    )


def get_sets_json():
    print(f"{HR}\nFetching Sets JSON from {SETS_URL}")
    res = requests.get(SETS_URL).json()
    print(f"{GREEN}✔ Success{ENDCOLOR}")
    return res


def parse_sets(sets_json):
    sets = [
        {"code": _set["code"].upper(), "icon": _set["icon_svg_uri"]}
        for _set in sets_json["data"]
    ]
    print(f"Sets found:  {len(sets)}")
    return sets


def write_gzip_file(output_file, data):
    with gzip.open(output_file, "w") as fp:
        fp.write(data.encode("utf-8"))
        fp.close()
    print(
        f"{HR}\nFile (~ {round(os.path.getsize(output_file) / (1024**2), 2)} MiB) written to {os.path.realpath(fp.name)}\n{HR}"
    )


def main():
    print(f"{HR}\nBulk Importer v{VERSION}\n{HR}")
    data_json = get_bulk_json()
    print(f"{GREEN}✔ Success{ENDCOLOR}\n{HR}\nRead:    {len(data_json)} cards")
    data = parse_data(data_json)
    sets_json = get_sets_json()
    sets = parse_sets(sets_json)
    write_gzip_file(OUTPUT_FILE, json.dumps({"data": data, "sets": sets}))


main()
