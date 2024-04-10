#open the csv


#for each row, check Value. if its a string, turn it into an int, if it's null, turn it into a string

import csv
import pandas as pd

newfile = []
i = -1


statePop = {
    "Alabama" : 51,
    "Alaska":  7,
    "Arizona":  74,
    "Arkansas":  31,
    "California":  390,
    "Colorado":  59,
    "Connecticut":  36,
    "Delaware":  10,
    "Maryland":  68,
    "Florida":  226,
    "Georgia":  110,
    "Hawaii":  14,
    "Idaho":  20,
    "Illinois":  125,
    "Indiana":  69,
    "Iowa":  32,
    "Kansas":  29,
    "Kentucky":  45,
    "Louisiana":  46,
    "Maine":  14,
    "Massachusetts":  70,
    "Michigan":  100,
    "Minnesota":  57,
    "Mississippi":  29,
    "Missouri":  62,
    "Montana":  11,
    "Nebraska":  20,
    "Nevada":  32,
    "New Hampshire":  14,
    "New Jersey":  93,
    "New Mexico":  21,
    "New York":  196,
    "North Carolina":  108,
    "North Dakota":  8,
    "Ohio":  118,
    "Oklahoma":  41,
    "Oregon":  42,
    "Pennsylvania":  130,
    "Puerto Rico":  500,
    "Rhode Island":  11,
    "South Carolina":  54,
    "South Dakota":  9,
    "Tennessee":  71,
    "Texas":  305,
    "Utah":  34,
    "Vermont":  6,
    "Virginia":  87,
    "Washington":  78,
    "West Virginia":  18,
    "Wisconsin":  59,
    "Wyoming":  6,
}

def toArr(string):
    retval = []
    col = 0
    i = 0
    j = -1
    for char in string:
        j += 1
        if(char == ','):
            retval.append(string[i:j])
            i = j+1
            col += 1
            if(col == 2):
                rest = string[j+1:]
                if(rest == "\n" or rest == ""):
                    retval.append("")
                else:
                    retval.append(int(string[j+1:].replace(",","").replace('\"',"")))
                return retval



firstRow = True
for row in open("data/COVID_data_full.csv"):
    i += 1
    
    if(i == 0):
        newfile.append(row)
        continue

    row = toArr(row)
    newRow = [row[0]]

    #add the state name, but ignore US totals,
        #and combine NYC/NY and MD/DC
    if(row[1] == "United States"):
        i -= 1
        continue
    elif(row[1] == "New York"):
        nyIndex = i
        newRow.append(row[1])
    elif(row[1] == "New York City"):
        if(newfile[nyIndex][2] != "No Data" and row[2] != ""):
            newfile[nyIndex][2] += row[2]/statePop["New York"]
        i -= 1
        continue
    elif(row[1] == "District of Columbia"):
        mlIndex = i
        newRow.append("Maryland")
    elif(row[1] == "Maryland"):
        if(newfile[mlIndex][2] != "No Data" and row[2] != ""):
            newfile[mlIndex][2] += row[2]/statePop["Maryland"]
        elif(row[2] != "No Data" and row[2] != ""):
            newfile[mlIndex][2] = row[2]/statePop["Maryland"]
        else:
            newfile[mlIndex][2] = "No Data"
        i -= 1
        continue
    else:
        newRow.append(row[1])
    
    #add the number of deaths, but make sure it's an int
        #unless there's no data because the thing
        #hates strings, so for no data we'll give it strings.
    if(row[2] == ''):
        newRow.append("No Data")
    else:
        newRow.append(row[2]/statePop[newRow[1]])

    newfile.append(newRow)


#convert from arr to csv

output = ""

first = True
for row in newfile:
    if(first):
        output += row
        first = False
    else:
        output += row[0] + "," + row[1] + "," + str(row[2]) + "\n"

with open("COVID_data_perCapita.csv", "w+") as f:
    f.write(output)