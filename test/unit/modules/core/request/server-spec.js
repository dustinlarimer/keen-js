var chai = require("chai"),
    expect = require("chai").expect,
    spies = require("chai-spies");

chai.use(spies);

var Keen = require("../../../../../lib/index"),
    keenHelper = require("../../../helpers/test-config"),
    mock = require("../../../helpers/mockServerRequests");

describe("Keen.Request", function() {

  beforeEach(function() {
    this.client = new Keen({
      projectId: keenHelper.projectId,
      masterKey: keenHelper.masterKey,
      readKey: keenHelper.readKey,
      protocol: keenHelper.protocol
    });
    this.query = new Keen.Query("count", {
      event_collection: "test-collection"
    });
  });

  afterEach(function(){
    this.client = undefined;
    this.query = undefined;
  });

  describe("<Client>.run method", function(){

    it("should be a method", function(){
      expect(this.client.run).to.be.a("function");
    });

    it("should throw an error when passed an invalid object", function(){
      var self = this;
      expect(function(){ self.run(null); }).to.throw(Error);
      expect(function(){ self.run({}); }).to.throw(Error);
      expect(function(){ self.run(0); }).to.throw(Error);
      expect(function(){ self.run("string"); }).to.throw(Error);
    });

    it("should return a response when successful", function(){
      var response = { result: 0 };
      mock.post("/queries/count", 200, JSON.stringify(response));
      this.client.run(this.query, function(err, res){
        expect(err).to.be.a("null");
        expect(res.query).to.be.an('object');
        expect(res.result).to.equal(0);
        // done();
      });
    });

    it("should return an error when unsuccessful", function(){
      var response = { error_code: "ResourceNotFoundError", message: "no foo" };
      mock.post("/queries/count", 500, JSON.stringify(response));
      this.client.run(this.query, function(err, res){
        expect(err).to.exist;
        expect(err["code"]).to.equal(response.error_code);
        expect(res).to.be.a("null");
        // done();
      });
    });

    // it("should return an error when timed out", function(){
    //   mock.post("/queries/count", 500, '{ "timeout": 1, "message": "timeout of 1ms exceeded" }', 1000);
    //   var req = new Keen.Request(this.client, [this.query], function(err, res){
    //     expect(err).to.exist;
    //     expect(err["message"]).to.equal("timeout of 1ms exceeded");
    //     expect(res).to.be.a("null");
    //   });
    //   req
    //     .timeout(1)
    //     .refresh();
    // });

    it("should return an error when projectId is not present", function(){
      var brokenClient = new Keen({
        readKey: '123'
      })
      brokenClient.run(this.query, function(err, res){
        expect(err).to.exist;
        expect(res).to.be.a('null');
      });
    });

    it("should return an error when projectId is empty", function(){
      var brokenClient = new Keen({
        projectId: '',
        readKey: '123'
      })
      brokenClient.run(this.query, function(err, res){
        expect(err).to.exist;
        expect(res).to.be.a('null');
      });
    });

    it("should return an error when readKey is not present", function(){
      var brokenClient = new Keen({
        projectId: '123'
      })
      brokenClient.run(this.query, function(err, res){
        expect(err).to.exist;
        expect(res).to.be.a('null');
      });
    });

    it("should return an error when readKey is not empty", function(){
      var brokenClient = new Keen({
        projectId: '123',
        readKey: ''
      })
      brokenClient.run(this.query, function(err, res){
        expect(err).to.exist;
        expect(res).to.be.a('null');
      });
    });

    describe("Multiple queries", function(){
      it("should return a single response when successful", function(done){
        var response = [{ result: 0 }, { result: 0 }, { result: 0 }];
        mock.post("/queries/count", 200, JSON.stringify(response[0]));
        mock.post("/queries/count", 200, JSON.stringify(response[1]));
        mock.post("/queries/count", 200, JSON.stringify(response[2]));
        this.client.run([this.query, this.query, this.query], function(err, res){
          expect(err).to.be.a("null");
          expect(res).to.be.an("array").and.to.have.length(3);
          expect(res[0].result).to.equal(0);
          expect(res[1].result).to.equal(0);
          expect(res[2].result).to.equal(0);
          done();
        });
      });
      it('should return a single error when unsuccessful', function(done) {
        var response = { error_code: "ResourceNotFoundError", message: "no foo" };
        mock.post("/queries/count", 500, JSON.stringify(response));
        mock.post("/queries/count", 500, JSON.stringify(response));
        mock.post("/queries/count", 200, JSON.stringify({ result: 1 }));
        this.client.run([this.query, this.query, this.query], function(err, res){
          expect(err).to.exist;
          expect(err["code"]).to.equal(response.error_code);
          expect(res).to.be.a("null");
          done();
        });
      });
    });

    describe("saved queries", function() {
      it("returns result of the saved query when saved query is found", function() {
        var savedQuery = new Keen.Query("saved", { queryName: "page-visit-count" });
        var savedQueryResponse = {
          query_name: "page-visit-count",
          query: {
            analysis_type: "count",
            event_collection: "pagevisits"
          },
          result: 100
        };
        mock.get("/queries/saved/page-visit-count/result", 200, JSON.stringify(savedQueryResponse));

        this.client.run(savedQuery, function(err, res) {
          expect(res).to.deep.equal(savedQueryResponse);
        });
      });

      it("returns an error if saved query is not found", function() {
        var savedQuery = new Keen.Query("saved", { queryName: "page-visit-count" });
        var savedQueryResponse = {
          // message: "Query not found",
          // error_code: "QueryNotFound"
        };
        mock.get("/queries/saved/page-visit-count/result", 404, JSON.stringify(savedQueryResponse));

        this.client.run(savedQuery, function(err, res) {
          expect(err["code"]).to.equal("InvalidHTTPMethodError");
          expect(res).to.be.a("null");
        });
      });
    });

  });

});
