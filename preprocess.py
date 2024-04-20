import pandas as pd
import json

filename = "./data/alljoined_airlines.csv"
# df = pd.read_csv(filename, skiprows=lambda x: x in range(1, 5), nrows=100, header=0) # skip index 1-4 and read the next 10 index
with open("airport_code_to_state.json") as f:
# with open("airport_code_to_iata_code.json") as f:
    mapping = json.load(f)
chunksize = 10000
# index = 0
index = -1
for df in pd.read_csv(filename,
                      chunksize=chunksize,
                      usecols=["FL_DATE", "ORIGIN_AIRPORT_ID",
                               "DEST_AIRPORT_ID"],
                      dtype={"ORIGIN_AIRPORT_ID": str, "DEST_AIRPORT_ID": str}):
    # index = index + 1
    # if index <= 1586:
    #     print(f'skip: out{index}.csv')
    #     continue
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