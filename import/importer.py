import locale
import gzip
import json
import os
import shutil
import requests

IMPORTER_VERSION = 1.5
APP_VERSION = 1.4
HR = "-" * shutil.get_terminal_size().columns
INDENT = "    "
HEADERS = {"User-Agent": f"WhichCostsMore/{APP_VERSION}", "Accept": "*/*"}
BULK_URL = "https://api.scryfall.com/bulk-data/default-cards"
SETS_URL = "https://api.scryfall.com/sets"
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "../src/data.gzip")
GREEN = "\033[92m"
YELLOW = "\033[33m"
ENDCOLOR = "\033[0m"
session = requests.Session()


def get_bulk_json():
    print(f"➲ Fetching Bulk URI from {BULK_URL}")
    response = session.get(BULK_URL)
    print(f"{INDENT}{YELLOW}{response}{ENDCOLOR}")
    bulk_info = response.json()
    print(
        f"➲ Opening Stream of Bulk JSONL (~ {round(bulk_info['compressed_size'] / (1024**2), 2)} MiB) from {bulk_info['jsonl_download_uri']}"
    )
    response = requests.get(bulk_info["jsonl_download_uri"], stream=True)
    print(f"{INDENT}{YELLOW}{response}{ENDCOLOR}")
    print(f"➲ Decompressing and parsing JSONL from Stream")
    bulk_data = parse_compressed_jsonl_stream(response.raw)
    print(f"{INDENT}Read:    {len(bulk_data):n} cards")
    return bulk_data


def parse_compressed_jsonl_stream(raw_stream):
    parsed_data = []
    with gzip.GzipFile(fileobj=raw_stream) as stream:
        for line_bytes in stream:
            if line_bytes.strip():
                parsed_data.append(json.loads(line_bytes))
    return parsed_data


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
    print(f"{INDENT}Ported:  {len(card_data):n} cards ({round(percent, 2)}%)")
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
    print(f"➲ Fetching Sets JSON from {SETS_URL}")
    response = session.get(SETS_URL)
    print(f"{INDENT}{YELLOW}{response}{ENDCOLOR}")
    return response.json()


def parse_sets(sets_json):
    sets = [
        {"code": _set["code"].upper(), "icon": _set["icon_svg_uri"]}
        for _set in sets_json["data"]
    ]
    print(f"{INDENT}Found:  {len(sets):n} sets")
    return sets


def write_gzip_file(output_file, data):
    with gzip.open(output_file, "w") as fp:
        fp.write(data.encode("utf-8"))
        fp.close()
    print(
        f"✅ File (~ {round(os.path.getsize(output_file) / (1024**2), 2)} MiB) written to {os.path.realpath(fp.name)}\n{HR}"
    )


def main():
    locale.setlocale(locale.LC_ALL, "")
    session.headers.update(HEADERS)
    print(f"{HR}\nBulk Importer v{IMPORTER_VERSION}\n{HR}")
    data_json = get_bulk_json()
    data = parse_data(data_json)
    sets_json = get_sets_json()
    sets = parse_sets(sets_json)
    write_gzip_file(OUTPUT_FILE, json.dumps({"data": data, "sets": sets}))


main()
