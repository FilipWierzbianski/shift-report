# Pre-generate the agent's lines with neural voices (edge-tts), as static files for the prototype.
import asyncio, hashlib, json, os, sys
import edge_tts

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "..", "public", "voice")
VOICES = {"en": "en-GB-SoniaNeural", "pl": "pl-PL-ZofiaNeural"}
os.makedirs(OUT, exist_ok=True)
lines = json.load(open(os.path.join(HERE, "lines.json")))
manifest = {}

# What the voices misread, respelled only for the recording (the screen keeps the real spelling).
# Polish: "opowiedz" came out as "opowiedź" (final -dz is said [ts]); numbers are read as written
# ("na kasie 2" became "na kasie dwóch"), so times, tills, cameras and amounts are spelled the way people say them.
SAY = {
    "pl": [
        ("Opowiedz", "Opowiec"), ("opowiedz", "opowiec"),
        ("Na kasie 2", "Na kasie drugiej"), ("na kasie 2", "na kasie drugiej"),
        ("6 pozycji w 10 minut", "sześć pozycji w dziesięć minut"),
        ("około 23:40", "około dwudziestej trzeciej czterdzieści"),
        ("sobie 1:10", "sobie pierwszą dziesięć"),
        ("o 00:30", "o wpół do pierwszej"),
        ("o 01:40", "o pierwszej czterdzieści"), ("o 1:40", "o pierwszej czterdzieści"),
        ("kamera 3", "kamera numer trzy"), ("kamery 3", "kamery numer trzy"),
        ("225 zł", "dwieście dwadzieścia pięć złotych"),
        ("na 9 rano", "na dziewiątą rano"),
    ],
    "en": [
        ("Till 2", "Till two"),
        ("around 23:40", "around eleven forty"),
        ("Picture 1:10", "Picture ten past one"),
        ("at 00:30", "at half past twelve"),
        ("at 01:40", "at one forty"), ("at 1:40", "at one forty"),
        ("£45", "forty-five pounds"),
        ("at 9:", "at nine:"),
    ],
}

def spoken(item):
    text = item["text"]
    for a, b in SAY[item["lang"]]:
        text = text.replace(a, b)
    return text

async def one(sem, item):
    key = f'{item["lang"]}:{item["text"]}'
    # The file name follows what is said, so a pronunciation fix gets a new URL (no stale cache).
    h = hashlib.sha1(f'{item["lang"]}:{spoken(item)}'.encode()).hexdigest()[:12]
    manifest[key] = h
    path = f"{OUT}/{h}.mp3"
    if os.path.exists(path):
        return
    async with sem:
        await edge_tts.Communicate(spoken(item), VOICES[item["lang"]], rate="+2%").save(path)

async def main():
    sem = asyncio.Semaphore(6)
    await asyncio.gather(*(one(sem, x) for x in lines))
    json.dump(manifest, open(f"{OUT}/manifest.json", "w"), ensure_ascii=False, indent=0)
    # Drop recordings nothing points to any more.
    keep = {f"{h}.mp3" for h in manifest.values()} | {"manifest.json"}
    for f in os.listdir(OUT):
        if f not in keep:
            os.remove(os.path.join(OUT, f))
    print(len(manifest), "lines")

asyncio.run(main())
