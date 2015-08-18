var fs = require("fs");
var mysql = require("mysql");

// Set up basic variables
var years = [2008,2012,2016];
var candidates = [];
var final_candidates = [];
var pending_queries = 0;

// Connect to the database
var connection = connectMySQL();

// Open list of candidates we care about
var selected_candidates = JSON.parse(fs.readFileSync("selected_candidates.json"));


// Grab candidates
years.forEach(function(year){
	// Pull list of candidates we care about from this year
	var candidates_query_string = selected_candidates[selected_candidates.map(function(d){ return d.year }).indexOf(year)].candidates.join('" OR CAND_NAME = "');
	console.log(candidates_query_string);
	pending_queries++;
	connection.query("SELECT CAND_NAME, CAND_ID, CAND_PCC, CAND_ELECTION_YR FROM " + year + "_candidates WHERE CAND_ELECTION_YR = ? AND CAND_OFFICE = 'P' AND (CAND_NAME = \"" + candidates_query_string + "\")",
	[year], function(err, rows, header){
		if(err) throw err;
		pending_queries--;
		rows.forEach(function(row){
			candidates.push(row);
		});
		if(pending_queries == 0){
			fs.writeFile("candidates.json", JSON.stringify(candidates, null, "\t"));
			getLinkages(candidates);
		}
	});
});

function getLinkages(candidates){
	candidates.forEach(function(candidate){
		pending_queries++;
		
		// Set up basic candidate object
		var candidateObj = candidate;
		candidateObj.linkages = [];
		
		// Get individual contributions to candidate, 
		// using a union of both the individual contributions table and 
		// then individual contributions from the committee transfer table
		connection.query("SELECT COUNT(*) as count, SUM(sum) as sum \
		FROM ( \
			SELECT SUBSTRING_INDEX(NAME, ' ', 2) AS NAME, ZIP_CODE, SUM(sum) as sum \
			FROM ( \
				SELECT SUBSTRING_INDEX(NAME, ' ', 2) AS NAME, LEFT(ZIP_CODE, 5) AS ZIP_CODE, SUM(TRANSACTION_AMT) as sum \
				FROM " + candidateObj.CAND_ELECTION_YR +  "_INDIVIDUAL_CAMPAIGN_CONTRIBUTIONS WHERE CMTE_ID=? \
				GROUP BY NAME, ZIP_CODE \
				UNION ALL \
					SELECT SUBSTRING_INDEX(NAME, ' ', 2) AS NAME, LEFT(ZIP_CODE, 5) AS ZIP_CODE, SUM(TRANSACTION_AMT) as sum \
					FROM " + candidateObj.CAND_ELECTION_YR + "_committee_transactions WHERE CMTE_ID=? \
						AND (ENTITY_TP = 'IND' OR ENTITY_TP = 'CAN') \
					GROUP BY NAME, ZIP_CODE \
				UNION ALL \
					SELECT SUBSTRING_INDEX(NAME, ' ', 2) AS NAME, LEFT(ZIP_CODE, 5) AS ZIP_CODE, SUM(TRANSACTION_AMT) as sum \
					FROM " + candidateObj.CAND_ELECTION_YR + "_committee_transactions WHERE CMTE_ID=?  \
						AND (ENTITY_TP = 'CCM' OR ENTITY_TP = 'COM' OR ENTITY_TP = 'ORG' OR ENTITY_TP = 'PAC' OR ENTITY_TP = 'PTY') \
					GROUP BY NAME, ZIP_CODE \
			) as a \
			GROUP BY NAME, ZIP_CODE \
		) as b",
		[candidateObj.CAND_PCC, candidateObj.CAND_PCC, candidateObj.CAND_PCC], function(err, rows, header){
			if( err ) throw err;
			// Store candidate contributor stats
			console.log("Got contribution stats for " + candidateObj.CAND_NAME);
			candidateObj.contributions_count = rows[0].count;
			candidateObj.contributions_sum = rows[0].sum;
			
			// Loop through other candidates to build linkages
			var local_pending_queries = 0;
			candidates.forEach(function(queryCandidate){
				local_pending_queries++;
				var linkageObj = { candidate: { name: queryCandidate.CAND_NAME, year: queryCandidate.CAND_ELECTION_YR } };
			
				
				connection.query("\
				SELECT COUNT(*) as count, SUM(a.sum) as sum \
				FROM( \
					SELECT SUBSTRING_INDEX(NAME, ' ', 2) AS NAME, ZIP_CODE, SUM(sum) as sum \
					FROM ( \
						SELECT SUBSTRING_INDEX(NAME, ' ', 2) AS NAME, LEFT(ZIP_CODE, 5) AS ZIP_CODE, SUM(TRANSACTION_AMT) as sum \
							FROM " + candidateObj.CAND_ELECTION_YR + "_INDIVIDUAL_CAMPAIGN_CONTRIBUTIONS WHERE CMTE_ID=? \
						GROUP BY NAME, ZIP_CODE \
						UNION ALL \
							SELECT SUBSTRING_INDEX(NAME, ' ', 2) AS NAME, LEFT(ZIP_CODE, 5) AS ZIP_CODE, SUM(TRANSACTION_AMT) as sum \
							FROM " + candidateObj.CAND_ELECTION_YR + "_committee_transactions \
							WHERE CMTE_ID=? AND (ENTITY_TP = 'IND' OR ENTITY_TP = 'CAN') \
							GROUP BY NAME, ZIP_CODE \
						UNION ALL \
							SELECT SUBSTRING_INDEX(NAME, ' ', 2) AS NAME, LEFT(ZIP_CODE, 5) AS ZIP_CODE, SUM(TRANSACTION_AMT) as sum \
							FROM " + candidateObj.CAND_ELECTION_YR + "_committee_transactions WHERE CMTE_ID=? \
								AND (ENTITY_TP = 'CCM' OR ENTITY_TP = 'COM' OR ENTITY_TP = 'ORG' OR ENTITY_TP = 'PAC' OR ENTITY_TP = 'PTY') \
							GROUP BY NAME, ZIP_CODE \
					) as bleh \
					GROUP BY NAME, ZIP_CODE \
				) as a \
				JOIN ( \
					SELECT SUBSTRING_INDEX(NAME, ' ', 2) AS NAME, ZIP_CODE, sum(sum) as sum \
					FROM ( \
						SELECT SUBSTRING_INDEX(NAME, ' ', 2) AS NAME, LEFT(ZIP_CODE, 5) as ZIP_CODE, SUM(TRANSACTION_AMT) as sum \
						FROM " + queryCandidate.CAND_ELECTION_YR + "_INDIVIDUAL_CAMPAIGN_CONTRIBUTIONS WHERE CMTE_ID=? \
						GROUP BY NAME, ZIP_CODE \
						UNION ALL \
							SELECT SUBSTRING_INDEX(NAME, ' ', 2) AS NAME, LEFT(ZIP_CODE, 5) AS ZIP_CODE, SUM(TRANSACTION_AMT) as sum \
							FROM " + queryCandidate.CAND_ELECTION_YR + "_committee_transactions WHERE CMTE_ID=? \
								AND (ENTITY_TP = 'IND' OR ENTITY_TP = 'CAN') \
							GROUP BY NAME, ZIP_CODE \
						UNION ALL \
							SELECT SUBSTRING_INDEX(NAME, ' ', 2) AS NAME, LEFT(ZIP_CODE, 5) AS ZIP_CODE, SUM(TRANSACTION_AMT) as sum \
							FROM " + queryCandidate.CAND_ELECTION_YR + "_committee_transactions WHERE CMTE_ID=? \
								AND (ENTITY_TP = 'CCM' OR ENTITY_TP = 'COM' OR ENTITY_TP = 'ORG' OR ENTITY_TP = 'PAC' OR ENTITY_TP = 'PTY') \
							GROUP BY NAME, ZIP_CODE \
					) as bleh \
					GROUP BY NAME, ZIP_CODE \
				) as b \
				ON a.NAME = b.NAME and a.ZIP_CODE = b.ZIP_CODE",
				[candidate.CAND_PCC, candidate.CAND_PCC, candidate.CAND_PCC, queryCandidate.CAND_PCC, queryCandidate.CAND_PCC, queryCandidate.CAND_PCC], function(err, rows, header){
					if( err ) throw err;
					console.log(rows);
					local_pending_queries--;
					console.log(candidate.CAND_NAME + " and " + queryCandidate.CAND_NAME + ": ")

					// Store linkage stats
					linkageObj.count = rows[0].count;
					linkageObj.sum = rows[0].sum; 
					linkageObj.count_percentage = linkageObj.count / candidateObj.count * 100;
					candidateObj.linkages.push(linkageObj);

					// Add to candidate's linkage array
					if(local_pending_queries == 0){
						final_candidates.push(candidateObj);
						pending_queries--;
						console.log("Total queries left: " + pending_queries);
					}

					// Candidate is finished -- push candidate object
					if( pending_queries == 0){
						console.log(final_candidates);
						fs.writeFile("final_candidates.json", JSON.stringify(final_candidates, null, "\t"));
					}
				});	
			});
			
		});
	});
}

function getCandidateStats(candidateObj, callback){
	
	
}

function connectMySQL(){
	// Open connection to mySQL database
	var connection = mysql.createConnection(process.env.CLEARDB_DATABASE_URL || "mysql://root@localhost/campfi_all_time");
	connection.on("error", function(err){  
		connection.end();
		 return setTimeout(function(){ return connectMySQL() },3000);
	});

	connection.connect( function(err){ if(err) throw err; });
	
	return connection;
}