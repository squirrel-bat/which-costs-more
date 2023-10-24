import gzip
import json
import shutil
import requests

HR = "\n" + ("-" * shutil.get_terminal_size().columns) + "\n"
API_URL = "https://api.scryfall.com/bulk-data/default-cards"
OUTPUT_FILE = "../src/data.gzip"


def get_bulk_json():
    print(f"Fetching bulk URI from {API_URL}")
    res = requests.get(API_URL).json()
    print(f"Fetching bulk from {res['download_uri']}")
    return requests.get(res["download_uri"]).json()


def parse_data(data_json):
    print(f"Success.{HR}Read:    {len(data_json)}")
    card_data = []
    for card in data_json:
        if (
            None in (card["prices"]["eur"], card["prices"]["usd"])
            or "image_uris" not in card
            or "normal" not in card["image_uris"]
            or card["lang"] != "en"
            or card["digital"] is True
            or "paper" not in card["games"]
        ):
            continue
        else:
            card_stripped = {
                "name": card["name"],
                "img_uri": card["image_uris"]["normal"],
                "prices": card["prices"],
                "scryfall_uri": card["scryfall_uri"],
            }
            card_data.append(card_stripped)
    if len(card_data) == 0:
        return
    json_data = json.dumps(card_data)
    with gzip.open(OUTPUT_FILE, "w") as fp:
        fp.write(json_data.encode("utf-8"))
        fp.close()
    print(f"Ported:  {len(card_data)}")


def main():
    parse_data(get_bulk_json())


main()
