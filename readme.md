# Requirements

* MySQL server
* Node.js

# Cleaning the data

This project uses the 2008, 2012 and 2016 "Committee Master File," "Candidate Master File," "Contributions by Individuals," and "Any Transaction from One Committee to Another" tables from the Federal Election Commission's [detailed file repository](http://www.fec.gov/finance/disclosure/ftpdet.shtml).

You'll want to upload those to your MySQL database in a series of tables of the format `YYYY_candidates`, `YYYY_committees`, `YYYY_individual_campaign_contributions_Full` and `YYYY__committee_transactions`.

I also ran the following queries to slim down the massive itemized contributions tables to just the presidential committees we care about from each year. Feel free to skip this if you're willing to wait a while for the data to process.

```
TRUNCATE 2008_INDIVIDUAL_CAMPAIGN_CONTRIBUTIONS;
INSERT INTO 2008_INDIVIDUAL_CAMPAIGN_CONTRIBUTIONS
	SELECT * FROM 2008_INDIVIDUAL_CAMPAIGN_CONTRIBUTIONS_FULL
	WHERE CMTE_ID = "C00438507"
		OR CMTE_ID = "C00430512"
		OR CMTE_ID = "C00431569"
		OR CMTE_ID = "C00431205"
		OR CMTE_ID = "C00430975"
		OR CMTE_ID = "C00452532"
		OR CMTE_ID = "C00423202"
		OR CMTE_ID = "C00431916"
		OR CMTE_ID = "C00432914"
		OR CMTE_ID = "C00430470"
		OR CMTE_ID = "C00431445"
		OR CMTE_ID = "C00431171"
		OR CMTE_ID = "C00431379"
		OR CMTE_ID = "C00431411"
		OR CMTE_ID = "C00431577"
		OR CMTE_ID = "C00431809"
```

```
TRUNCATE 2012_INDIVIDUAL_CAMPAIGN_CONTRIBUTIONS;
INSERT INTO 2012_INDIVIDUAL_CAMPAIGN_CONTRIBUTIONS
	SELECT * FROM 2012_INDIVIDUAL_CAMPAIGN_CONTRIBUTIONS_FULL
	WHERE CMTE_ID = "C00493692"
		OR CMTE_ID = "C00494443"
		OR CMTE_ID = "C00496034"
		OR CMTE_ID = "C00410118"
		OR CMTE_ID = "C00498444"
		OR CMTE_ID = "C00500587"
		OR CMTE_ID = "C00496497"
		OR CMTE_ID = "C00495820"
		OR CMTE_ID = "C00431445"
		OR CMTE_ID = "C00431171"
```

```
TRUNCATE 2016_INDIVIDUAL_CAMPAIGN_CONTRIBUTIONS;
INSERT INTO 2016_INDIVIDUAL_CAMPAIGN_CONTRIBUTIONS
	SELECT * FROM 2016_INDIVIDUAL_CAMPAIGN_CONTRIBUTIONS_FULL
	WHERE CMTE_ID = "C00575795"
		OR CMTE_ID = "C00578492"
		OR CMTE_ID = "C00500587"
		OR CMTE_ID = "C00575449"
		OR CMTE_ID = "C00581876"
		OR CMTE_ID = "C00573519"
		OR CMTE_ID = "C00574624"
		OR CMTE_ID = "C00458844"
		OR CMTE_ID = "C00577130"
		OR CMTE_ID = "C00577312"
		OR CMTE_ID = "C00578245"
		OR CMTE_ID = "C00578658"
		OR CMTE_ID = "C00578757"
		OR CMTE_ID = "C00579458"
		OR CMTE_ID = "C00579706"
		OR CMTE_ID = "C00580159"
		OR CMTE_ID = "C00580399"
		OR CMTE_ID = "C00581215"
		OR CMTE_ID = "C00580100"
		OR CMTE_ID = "C00431288"
		OR CMTE_ID = "C00577981"
```

Running `node index.js` will create (after a while!) `final_candidates.json`, which holds the overlap data.

# Notes

Some of the candidates in the candidates file have the wrong committee ID attached to their names. Here are a list of correct `CMTE_ID` fields.
* 2008
  * Ron Paul: C00432914
  * John Edwards: C00431205
* 2012
* 2016
  * John Kasich: C00581876
  * Jim Gilmore: An odd duck, he has three different committees, only one of which is attached to his presidential campaign -- but THAT committee doesn't show up in the committee file.