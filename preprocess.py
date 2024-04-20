import pandas as pd
import json

filename = "./data/alljoined_airlines.csv"
with open("airport_code_to_state.json") as f:
    mapping = json.load(f)
chunksize = 10000

### read CSV on batches
for df in pd.read_csv(filename,
                      chunksize=chunksize,
                      usecols=["FL_DATE", "ORIGIN_AIRPORT_ID",
                               "DEST_AIRPORT_ID"],
                      dtype={"ORIGIN_AIRPORT_ID": str, "DEST_AIRPORT_ID": str}):

    print("done reading")
    
    df = df.replace({"ORIGIN_AIRPORT_ID": mapping})
    df = df.replace({"DEST_AIRPORT_ID": mapping})
    print("done mapping")

    df = df.groupby(["FL_DATE", "ORIGIN_AIRPORT_ID",
                    "DEST_AIRPORT_ID"]).size().reset_index(name="count")
    print("done grouping")

    remove_state = ["PR", "TT"]
    df = df[~df["ORIGIN_AIRPORT_ID"].isin(remove_state)]
    df = df[~df["DEST_AIRPORT_ID"].isin(remove_state)]


    df.to_csv(f'./data/temp/out{index}.csv', index=False)
    index = index + 1
print(f"done with out{index}.csv")