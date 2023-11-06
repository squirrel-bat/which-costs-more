import gzip
import json
import os
import shutil
import requests

VERSION = 1.1
HR = "-" * shutil.get_terminal_size().columns
API_URL = "https://api.scryfall.com/bulk-data/default-cards"
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "../src/data.gzip")


def get_bulk_json():
    print(f"Fetching Bulk URI from {API_URL}")
    res = requests.get(API_URL).json()
    print(f"✔ Success")
    print(
        f"Fetching Bulk JSON (~{round(res['size'] / (1024**2), 2)} MB) from {res['download_uri']}"
    )
    return requests.get(res["download_uri"]).json()


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


def parse_data(data_json):
    card_data = [
        {
            "name": card["name"],
            "img_uri": card["image_uris"]["normal"],
            "prices": card["prices"],
            "scryfall_uri": card["scryfall_uri"],
        }
        for card in data_json
        if is_valid_card(card)
    ]
    percent = (len(card_data) / len(data_json)) * 100.0
    print(f"Ported:  {len(card_data)} cards ({round(percent, 2)}%)")
    return json.dumps(card_data)


def write_gzip_file(output_file, data):
    with gzip.open(output_file, "w") as fp:
        fp.write(data.encode("utf-8"))
        fp.close()
    print(f"{HR}\nFile written to {os.path.realpath(fp.name)}\n{HR}")


def main():
    print(f"{HR}\nBulk Importer v{VERSION}\n{HR}")
    data_json = get_bulk_json()
    print(f"✔ Success\n{HR}\nRead:    {len(data_json)} cards")
    data = parse_data(data_json)
    write_gzip_file(OUTPUT_FILE, data)


main()
